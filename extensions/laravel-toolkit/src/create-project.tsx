import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { openInEditor } from "./utils/editor";
import { saveProject } from "./utils/projects";
import { getCustomPackages, CustomPackage } from "./utils/custom-packages";

const execAsync = promisify(exec);

// ============================================================================
// Configuration
// ============================================================================

// Base auth kits (only one can be selected)
const BASE_KITS = [
  { title: "None (Bare Laravel)", value: "none", description: "Fresh Laravel without auth scaffolding" },
  { title: "Laravel Breeze (Blade)", value: "breeze-blade", description: "Simple auth with Blade templates" },
  { title: "Laravel Breeze (Vue)", value: "breeze-vue", description: "Simple auth with Vue + Inertia" },
  { title: "Laravel Breeze (React)", value: "breeze-react", description: "Simple auth with React + Inertia" },
  { title: "Laravel Breeze (Livewire)", value: "breeze-livewire", description: "Simple auth with Livewire" },
  { title: "Laravel Breeze (API)", value: "breeze-api", description: "API-only auth scaffolding" },
  {
    title: "Laravel Jetstream (Livewire)",
    value: "jetstream-livewire",
    description: "Full auth with teams using Livewire",
  },
  {
    title: "Laravel Jetstream (Inertia)",
    value: "jetstream-inertia",
    description: "Full auth with teams using Inertia",
  },
];

// Stackable packages (multiple can be selected)
interface StackablePackage {
  id: string;
  title: string;
  package: string;
  category: string;
  setup?: string;
  type?: "composer" | "npm";
}

const STACKABLE_PACKAGES: StackablePackage[] = [
  // Admin Panels
  {
    id: "filament",
    title: "Filament",
    package: "filament/filament",
    category: "Admin",
    setup: "php artisan filament:install --panels",
  },
  { id: "orchid", title: "Orchid", package: "orchid/platform", category: "Admin", setup: "php artisan orchid:install" },
  { id: "voyager", title: "Voyager", package: "tcg/voyager", category: "Admin", setup: "php artisan voyager:install" },
  { id: "backpack", title: "Backpack", package: "backpack/crud", category: "Admin" },

  // Frontend
  { id: "livewire", title: "Livewire", package: "livewire/livewire", category: "Frontend" },
  { id: "inertia", title: "Inertia.js", package: "inertiajs/inertia-laravel", category: "Frontend" },

  // API & Auth
  { id: "sanctum", title: "Laravel Sanctum", package: "laravel/sanctum", category: "API" },
  { id: "passport", title: "Laravel Passport", package: "laravel/passport", category: "API" },
  { id: "socialite", title: "Laravel Socialite", package: "laravel/socialite", category: "API" },

  // Utilities
  { id: "scout", title: "Laravel Scout", package: "laravel/scout", category: "Utilities" },
  { id: "cashier", title: "Laravel Cashier", package: "laravel/cashier", category: "Utilities" },
  { id: "spatie-permission", title: "Spatie Permission", package: "spatie/laravel-permission", category: "Utilities" },
  { id: "spatie-media", title: "Spatie Media Library", package: "spatie/laravel-medialibrary", category: "Utilities" },
  { id: "spatie-backup", title: "Spatie Backup", package: "spatie/laravel-backup", category: "Utilities" },
];

// Packages included with each auth kit (for smart filtering)
const KIT_INCLUDED_PACKAGES: Record<string, string[]> = {
  "breeze-blade": [],
  "breeze-vue": ["inertia"],
  "breeze-react": ["inertia"],
  "breeze-livewire": ["livewire"],
  "breeze-api": ["sanctum"],
  "jetstream-livewire": ["livewire", "sanctum"],
  "jetstream-inertia": ["inertia", "sanctum"],
  none: [],
};

const DEV_TOOLS = [
  { id: "debugbar", title: "Laravel Debugbar", package: "barryvdh/laravel-debugbar", dev: true },
  {
    id: "idehelper",
    title: "IDE Helper",
    package: "barryvdh/laravel-ide-helper",
    dev: true,
    setup: "php artisan ide-helper:generate",
  },
  { id: "pint", title: "Laravel Pint", package: "laravel/pint", dev: true },
  {
    id: "telescope",
    title: "Laravel Telescope",
    package: "laravel/telescope",
    dev: false,
    setup: "php artisan telescope:install",
  },
  {
    id: "horizon",
    title: "Laravel Horizon",
    package: "laravel/horizon",
    dev: false,
    setup: "php artisan horizon:install",
  },
  {
    id: "pulse",
    title: "Laravel Pulse",
    package: "laravel/pulse",
    dev: false,
    setup: 'php artisan vendor:publish --provider="Laravel\\Pulse\\PulseServiceProvider"',
  },
];

const DATABASES = [
  { title: "SQLite", value: "sqlite" },
  { title: "MySQL", value: "mysql" },
  { title: "PostgreSQL", value: "pgsql" },
  { title: "MariaDB", value: "mariadb" },
  { title: "SQL Server", value: "sqlsrv" },
];

const TESTING_FRAMEWORKS = [
  { title: "PHPUnit (Default)", value: "phpunit" },
  { title: "Pest", value: "pest" },
];

// ============================================================================
// Helpers
// ============================================================================

function groupPackages(packages: StackablePackage[]): Record<string, StackablePackage[]> {
  return packages.reduce(
    (acc, pkg) => {
      const cat = pkg.category || "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(pkg);
      return acc;
    },
    {} as Record<string, StackablePackage[]>,
  );
}

// ============================================================================
// Component
// ============================================================================

export default function Command() {
  const preferences = getPreferenceValues<Preferences.CreateProject>();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBaseKit, setSelectedBaseKit] = useState("none");
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedDevTools, setSelectedDevTools] = useState<string[]>([]);
  const [customPackages, setCustomPackages] = useState<CustomPackage[]>([]);

  useEffect(() => {
    loadCustomPackages();
  }, []);

  async function loadCustomPackages() {
    setIsLoading(true);
    const pkgs = await getCustomPackages();
    setCustomPackages(pkgs);
    setIsLoading(false);
  }

  const storedPackages: StackablePackage[] = customPackages.map((p) => ({
    id: p.id,
    title: p.title,
    package: p.package,
    category: "Custom",
    type: p.type,
  }));

  const allPackages = [...STACKABLE_PACKAGES, ...storedPackages];

  // Smart filter: hide packages already included with selected auth kit
  const includedWithKit = KIT_INCLUDED_PACKAGES[selectedBaseKit] || [];
  const filteredPackages = allPackages.filter((pkg) => !includedWithKit.includes(pkg.id));
  const groupedPackages = groupPackages(filteredPackages);

  // Remove any selected packages that are now hidden due to kit change
  function handleBaseKitChange(kit: string) {
    setSelectedBaseKit(kit);
    const newIncluded = KIT_INCLUDED_PACKAGES[kit] || [];
    setSelectedPackages((prev) => prev.filter((id) => !newIncluded.includes(id)));
  }

  // ============================================================================
  // Create Project
  // ============================================================================

  async function handleSubmit(values: {
    projectName: string;
    directory: string;
    baseKit: string;
    packages: string[];
    database: string;
    testing: string;
    git: boolean;
    sail: boolean;
    devTools: string[];
  }) {
    // Use state values for controlled form fields
    values.baseKit = selectedBaseKit;
    values.packages = selectedPackages;
    values.devTools = selectedDevTools;
    if (!values.projectName) {
      showToast({ style: Toast.Style.Failure, title: "Project name is required" });
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(values.projectName)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Project Name",
        message: "Only letters, numbers, dashes, and underscores are allowed.",
      });
      return;
    }

    setIsLoading(true);
    const sanitizedDirectory = values.directory.replace(/"/g, '\\"');
    const projectPath = `${values.directory}/${values.projectName}`;

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating Laravel project...",
        message: "Step 1: Base installation",
      });

      // Step 1: Create base Laravel project with auth kit
      let command = `cd "${sanitizedDirectory}" && laravel new ${values.projectName}`;

      if (values.database && values.database !== "sqlite") {
        command += ` --database=${values.database}`;
      }

      if (!values.git) {
        command += " --no-git";
      }

      if (values.testing === "pest") {
        command += " --pest";
      }

      // Handle base auth kit
      if (values.baseKit.startsWith("breeze")) {
        command += " --breeze";
        if (values.baseKit === "breeze-vue") command += " --stack=vue";
        else if (values.baseKit === "breeze-react") command += " --stack=react";
        else if (values.baseKit === "breeze-livewire") command += " --stack=livewire";
        else if (values.baseKit === "breeze-api") command += " --stack=api";
      } else if (values.baseKit.startsWith("jetstream")) {
        command += " --jet";
        if (values.baseKit === "jetstream-inertia") command += " --stack=inertia";
        else command += " --stack=livewire";
      }

      await execAsync(command, { timeout: 300000 }); // 5 min timeout

      // Step 2: Install selected packages
      if (values.packages && values.packages.length > 0) {
        toast.message = "Step 2: Installing packages...";

        for (const pkgId of values.packages) {
          const pkg = allPackages.find((p) => p.id === pkgId);
          if (pkg && pkg.package) {
            toast.message = `Installing ${pkg.title}...`;

            // Detect if npm or composer
            if (pkg.type === "npm") {
              await execAsync(`cd "${projectPath.replace(/"/g, '\\"')}" && npm install ${pkg.package}`);
            } else {
              // Default to composer
              await execAsync(`cd "${projectPath.replace(/"/g, '\\"')}" && composer require ${pkg.package}`);
            }

            if (pkg.setup) {
              await execAsync(`cd "${projectPath}" && ${pkg.setup}`);
            }
          }
        }
      }

      // Step 3: Install dev tools
      if (values.devTools && values.devTools.length > 0) {
        toast.message = "Step 3: Installing dev tools...";

        for (const toolId of values.devTools) {
          const tool = DEV_TOOLS.find((t) => t.id === toolId);
          if (tool) {
            toast.message = `Installing ${tool.title}...`;
            const devFlag = tool.dev ? " --dev" : "";
            const safePath = projectPath.replace(/"/g, '\\"');
            await execAsync(`cd "${safePath}" && composer require ${tool.package}${devFlag}`);

            if (tool.setup) {
              await execAsync(`cd "${safePath}" && ${tool.setup}`);
            }
          }
        }
      }

      // Step 4: Initialize Sail if selected
      if (values.sail) {
        toast.message = "Step 4: Setting up Laravel Sail...";
        const safePath = projectPath.replace(/"/g, '\\"');
        await execAsync(`cd "${safePath}" && composer require laravel/sail --dev`);
        await execAsync(`cd "${safePath}" && php artisan sail:install --with=mysql,redis,mailpit`);
      }

      toast.style = Toast.Style.Success;
      toast.title = "🎉 Project created!";
      toast.message = values.projectName;

      // Save project to list for Manage Projects
      await saveProject({
        path: projectPath,
        name: values.projectName,
        createdAt: new Date().toISOString(),
        baseKit: values.baseKit,
        packages: values.packages,
      });

      await openInEditor(projectPath);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create project",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================================================
  // Install Actions
  // ============================================================================

  async function installComposer() {
    if (
      !(await confirmAlert({
        title: "Install Composer",
        message: "This will download and install Composer. Requires PHP to be installed. Continue?",
        primaryAction: { title: "Install" },
      }))
    )
      return;

    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Installing Composer..." });

      await execAsync(`php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"`);
      await execAsync(`php composer-setup.php`);
      await execAsync(`php -r "unlink('composer-setup.php');"`);

      toast.style = Toast.Style.Success;
      toast.title = "Composer installed!";
      toast.message = "Move composer.phar to your PATH";
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to install Composer",
        message: "Visit getcomposer.org for manual installation",
      });
    }
  }

  async function installLaravelInstaller() {
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Installing Laravel Installer..." });
      await execAsync("composer global require laravel/installer");
      toast.style = Toast.Style.Success;
      toast.title = "Laravel Installer ready!";
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to install",
        message: "Make sure Composer is installed first",
      });
    }
  }

  async function checkRequirements() {
    const checks: string[] = [];

    try {
      const { stdout } = await execAsync("php -v");
      const match = stdout.match(/PHP (\d+\.\d+)/);
      checks.push(`✅ PHP ${match ? match[1] : "installed"}`);
    } catch {
      checks.push("❌ PHP not found");
    }

    try {
      await execAsync("composer --version");
      checks.push("✅ Composer");
    } catch {
      checks.push("❌ Composer not found");
    }

    try {
      await execAsync("laravel --version");
      checks.push("✅ Laravel Installer");
    } catch {
      checks.push("⚠️ Laravel Installer (optional)");
    }

    try {
      await execAsync("git --version");
      checks.push("✅ Git");
    } catch {
      checks.push("⚠️ Git not found");
    }

    try {
      await execAsync("node --version");
      checks.push("✅ Node.js");
    } catch {
      checks.push("⚠️ Node.js (needed for frontend)");
    }

    await confirmAlert({
      title: "Requirements Check",
      message: checks.join("\n"),
      primaryAction: { title: "OK", style: Alert.ActionStyle.Default },
    });
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Create Project" icon={Icon.Plus} onSubmit={handleSubmit} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Setup">
            <Action
              title="Check Requirements"
              icon={Icon.Checkmark}
              onAction={checkRequirements}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action title="Install Composer" icon={Icon.Download} onAction={installComposer} />
            <Action title="Install Laravel Installer" icon={Icon.Download} onAction={installLaravelInstaller} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {/* Project Basics */}
      <Form.TextField id="projectName" title="Project Name" placeholder="my-laravel-app" />
      <Form.TextField
        id="directory"
        title="Parent Directory"
        defaultValue={preferences?.projectDirectory || "~/Projects"}
      />

      <Form.Separator />

      {/* Base Auth Kit */}
      <Form.Dropdown
        id="baseKit"
        title="Auth Starter Kit"
        value={selectedBaseKit}
        onChange={handleBaseKitChange}
        info="Only one auth kit can be used"
      >
        {BASE_KITS.map((kit) => (
          <Form.Dropdown.Item key={kit.value} value={kit.value} title={kit.title} />
        ))}
      </Form.Dropdown>

      {/* Stackable Packages */}
      <Form.TagPicker
        id="packages"
        title="Additional Packages"
        info="Select multiple packages to install together"
        value={selectedPackages}
        onChange={setSelectedPackages}
      >
        {Object.entries(groupedPackages).map(([category, pkgs]) =>
          pkgs.map((pkg) => <Form.TagPicker.Item key={pkg.id} value={pkg.id} title={`${pkg.title} (${category})`} />),
        )}
      </Form.TagPicker>

      <Form.Separator />

      {/* Database & Testing */}
      <Form.Dropdown id="database" title="Database" defaultValue="sqlite">
        {DATABASES.map((db) => (
          <Form.Dropdown.Item key={db.value} value={db.value} title={db.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="testing" title="Testing Framework" defaultValue="phpunit">
        {TESTING_FRAMEWORKS.map((t) => (
          <Form.Dropdown.Item key={t.value} value={t.value} title={t.title} />
        ))}
      </Form.Dropdown>

      {/* Dev Tools */}
      <Form.TagPicker id="devTools" title="Dev Tools" value={selectedDevTools} onChange={setSelectedDevTools}>
        {DEV_TOOLS.map((tool) => (
          <Form.TagPicker.Item key={tool.id} value={tool.id} title={tool.title} />
        ))}
      </Form.TagPicker>

      <Form.Separator />

      {/* Options */}
      <Form.Checkbox id="git" title="Options" label="Initialize Git repository" defaultValue={true} />
      <Form.Checkbox id="sail" label="Set up Laravel Sail (Docker)" defaultValue={false} />

      <Form.Description
        title="💡 Tip"
        text="Press Ctrl+K for Install Composer, Install Laravel, and Check Requirements."
      />
    </Form>
  );
}
