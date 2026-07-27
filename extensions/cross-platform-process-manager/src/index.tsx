import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  confirmAlert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";

const execAsync = promisify(exec);

// ============================================================================
// CONFIGURATION
// ============================================================================
const PRODUCT_ID = "AIw7QUsa7SZxp-Ncl-HXow==";
const GUMROAD_VERIFY_URL = "https://api.gumroad.com/v2/licenses/verify";
const GUMROAD_PRODUCT_URL = "https://joshua633.gumroad.com/l/jkxnnz";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// TYPESCRIPT MODELS
// ============================================================================
interface GumroadSubscription {
  ended_at: string | null;
  failed_at: string | null;
  user_requested_cancellation_at: string | null;
}

interface GumroadPurchase {
  refunded: boolean;
  chargebacked: boolean;
  subscription?: GumroadSubscription;
}

interface GumroadResponse {
  success: boolean;
  purchase?: GumroadPurchase;
  message?: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: string;
  mem: string;
  platform: "windows" | "macos";
}

// ============================================================================
// UTILITIES & SECURE STORAGE
// ============================================================================
const SecureStorage = {
  async set(key: string, value: string): Promise<void> {
    await LocalStorage.setItem(key, value);
  },
  async get(key: string): Promise<string | undefined> {
    return (await LocalStorage.getItem(key)) as string | undefined;
  },
  async remove(key: string): Promise<void> {
    await LocalStorage.removeItem(key);
  },
};

function getPlatform(): "windows" | "macos" {
  const platform = os.platform();
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "macos";
  throw new Error(`Unsupported platform: ${platform}`);
}

// ============================================================================
// PLATFORM ABSTRACTION LAYER
// ============================================================================
async function getProcesses(): Promise<ProcessInfo[]> {
  const platform = getPlatform();
  try {
    if (platform === "windows") {
      const { stdout } = await execAsync('tasklist /FO CSV /NH');
      const lines = stdout.trim().split("\r\n");
      return lines.map((line): ProcessInfo => {
        const cols = line.split(/","|"/).filter((c) => c !== "" && c !== ",");
        return {
          pid: parseInt(cols[1], 10) || 0,
          name: cols[0] || "Unknown",
          cpu: "N/A", 
          mem: cols[4] || "Unknown",
          platform: "windows",
        };
      }).filter((p) => p.pid > 0);
    } else {
      const { stdout } = await execAsync("ps -eo pid,comm,%cpu,%mem");
      const lines = stdout.trim().split("\n").slice(1); 
      return lines.map((line): ProcessInfo => {
        const cols = line.trim().split(/\s+/);
        return {
          pid: parseInt(cols[0], 10) || 0,
          name: cols[1] || "Unknown",
          cpu: `${cols[2]}%`,
          mem: `${cols[3]}%`,
          platform: "macos",
        };
      }).filter((p) => p.pid > 0);
    }
  } catch (error) {
    console.error("Failed to fetch processes:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch processes",
      message: "Ensure you have the necessary system permissions.",
    });
    return [];
  }
}

async function killProcess(pid: number, name: string): Promise<boolean> {
  const platform = getPlatform();
  try {
    if (platform === "windows") {
      await execAsync(`taskkill /F /PID ${pid}`);
    } else {
      await execAsync(`kill -9 ${pid}`);
    }
    await showToast({
      style: Toast.Style.Success,
      title: "Process Terminated",
      message: `${name} (PID: ${pid}) was successfully killed.`,
    });
    return true;
  } catch (error: any) {
    console.error("Failed to kill process:", error);
    const errorMsg = error.message?.includes("permission denied") || error.message?.includes("Access is denied")
      ? "Permission denied. Try running Raycast as Administrator/root."
      : "Failed to terminate process. It may be a critical system process.";
    
    await showToast({ style: Toast.Style.Failure, title: "Termination Failed", message: errorMsg });
    return false;
  }
}

// ============================================================================
// GUMROAD LICENSING LOGIC
// ============================================================================
async function validateLicense(key: string, showToasts: boolean = true): Promise<boolean> {
  try {
    const response = await fetch(GUMROAD_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ product_id: PRODUCT_ID, license_key: key }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = (await response.json()) as GumroadResponse;

    if (!data.success || !data.purchase) {
      if (showToasts) await showToast({ style: Toast.Style.Failure, title: "Invalid License", message: data.message || "Key not found." });
      return false;
    }

    const { refunded, chargebacked, subscription } = data.purchase;
    if (refunded || chargebacked) {
      if (showToasts) await showToast({ style: Toast.Style.Failure, title: "License Revoked", message: "Subscription refunded or charged back." });
      return false;
    }

    if (!subscription || subscription.ended_at || subscription.failed_at || subscription.user_requested_cancellation_at) {
      if (showToasts) await showToast({ style: Toast.Style.Failure, title: "Subscription Inactive", message: "Subscription canceled, failed, or expired." });
      return false;
    }

    await SecureStorage.set("licenseKey", key);
    await SecureStorage.set("lastValidatedAt", Date.now().toString());
    
    if (showToasts) await showToast({ style: Toast.Style.Success, title: "License Verified", message: "Premium features unlocked." });
    return true;
  } catch (error) {
    console.error("License validation error:", error);
    if (showToasts) await showToast({ style: Toast.Style.Failure, title: "Network Error", message: "Failed to connect to Gumroad. Check your internet." });
    return false;
  }
}

// ============================================================================
// MAIN REACT COMPONENT (FREEMIUM ARCHITECTURE)
// ============================================================================
export default function Command() {
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [view, setView] = useState<"list" | "paywall">("list");
  const [pendingKill, setPendingKill] = useState<{ pid: number; name: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [isProcessesLoading, setIsProcessesLoading] = useState<boolean>(false);

  useEffect(() => {
    const checkCache = async () => {
      setIsLoading(true);
      try {
        const cachedKey = await SecureStorage.get("licenseKey");
        const cachedTimestampStr = await SecureStorage.get("lastValidatedAt");
        
        if (cachedKey && cachedTimestampStr) {
          const lastValidatedAt = parseInt(cachedTimestampStr, 10);
          const isExpired = Date.now() - lastValidatedAt > CACHE_DURATION_MS;

          if (!isExpired) {
            setIsValidated(true);
            setIsLoading(false);
            loadProcesses();
            
            validateLicense(cachedKey, false).then((isValid) => {
              if (!isValid) {
                SecureStorage.remove("licenseKey");
                SecureStorage.remove("lastValidatedAt");
                setIsValidated(false);
              }
            });
          } else {
            const isValid = await validateLicense(cachedKey, false);
            if (isValid) setIsValidated(true);
            setIsLoading(false);
            loadProcesses();
          }
        } else {
          setIsLoading(false);
          loadProcesses();
        }
      } catch (error) {
        console.error("Cache check failed:", error);
        setIsLoading(false);
        loadProcesses();
      }
    };
    checkCache();
  }, []);

  const loadProcesses = async () => {
    setIsProcessesLoading(true);
    const data = await getProcesses();
    setProcesses(data);
    setIsProcessesLoading(false);
  };

  const handleKillAction = (pid: number, name: string) => {
    if (isValidated) {
      confirmAlert({
        title: `Terminate ${name}?`,
        message: `Are you sure you want to force kill PID ${pid}?`,
        icon: Icon.Warning,
        primaryAction: { title: "Kill Process", style: Alert.ActionStyle.Destructive },
      }).then(async (confirmed) => {
        if (confirmed) {
          const success = await killProcess(pid, name);
          if (success) loadProcesses();
        }
      });
    } else {
      setPendingKill({ pid, name });
      setView("paywall");
    }
  };

  if (isLoading) {
    return (
      <List isLoading={true}>
        <List.EmptyView icon={Icon.Lock} title="Loading Processes..." />
      </List>
    );
  }

  if (view === "paywall") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title={isVerifying ? "Validating..." : "Unlock & Execute"}
              icon={isVerifying ? Icon.Hourglass : Icon.Key}
              onSubmit={async (values: { licenseKey: string }) => {
                setIsVerifying(true);
                const isValid = await validateLicense(values.licenseKey, true);
                if (isValid) {
                  setIsValidated(true);
                  setView("list");
                  
                  if (pendingKill) {
                    await killProcess(pendingKill.pid, pendingKill.name);
                    setPendingKill(null);
                    loadProcesses();
                  }
                }
                setIsVerifying(false);
              }}
            />
            <Action.OpenInBrowser title="Buy Subscription ($14/mo)" url={GUMROAD_PRODUCT_URL} icon={Icon.Cart} />
            <Action title="Cancel" icon={Icon.ArrowLeft} onAction={() => { setView("list"); setPendingKill(null); }} shortcut={{ modifiers: ["esc"], key: "escape" }} />
          </ActionPanel>
        }
      >
        <Form.Description 
          title="Premium Feature Locked" 
          text={pendingKill 
            ? `Killing "${pendingKill.name}" (PID: ${pendingKill.pid}) requires an active $14/month subscription.` 
            : "Process termination requires an active $14/month subscription. Enter your Gumroad license key below to unlock."
          } 
        />
        <Form.TextField 
          id="licenseKey" 
          title="Gumroad License Key" 
          placeholder="Enter your license key" 
        />
        <Form.Description 
          title="Don't have a license?" 
          text="Purchase a subscription via the Action Panel to get your key. Viewing processes is 100% free!" 
        />
      </Form>
    );
  }

  return (
    <List
      isLoading={isProcessesLoading}
      searchBarPlaceholder="Search processes by name or PID..."
      actions={
        <ActionPanel>
          <Action title="Refresh Processes" icon={Icon.ArrowClockwise} onAction={loadProcesses} />
          {!isValidated && (
            <Action 
              title="Enter License Key" 
              icon={Icon.Key} 
              onAction={() => { setPendingKill(null); setView("paywall"); }} 
            />
          )}
          {isValidated && (
            <Action.OpenInBrowser title="Manage Subscription" url={GUMROAD_PRODUCT_URL} />
          )}
        </ActionPanel>
      }
    >
      <List.Section title={`Running Processes (${processes.length})`}>
        {processes.map((proc) => (
          <List.Item
            key={proc.pid}
            id={proc.pid.toString()}
            title={proc.name}
            subtitle={`PID: ${proc.pid} | CPU: ${proc.cpu} | Mem: ${proc.mem}`}
            icon={proc.platform === "windows" ? Icon.AppWindow : Icon.Terminal}
            accessories={[
              { tag: proc.platform === "windows" ? "Windows" : "macOS" },
              !isValidated ? { icon: Icon.Lock, tooltip: "Premium: Kill Process Locked" } : {}
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={isValidated ? "Kill Process" : "Unlock & Kill Process"}
                  icon={isValidated ? Icon.XMarkCircle : Icon.Lock}
                  shortcut={{ modifiers: ["cmd", "ctrl"], key: "k" }}
                  onAction={() => handleKillAction(proc.pid, proc.name)}
                />
                <Action.CopyToClipboard title="Copy PID" content={proc.pid.toString()} />
                {!isValidated && (
                  <Action.OpenInBrowser title="Buy Subscription ($14/mo)" url={GUMROAD_PRODUCT_URL} icon={Icon.Cart} />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
