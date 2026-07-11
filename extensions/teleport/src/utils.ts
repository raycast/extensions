import { spawnSync } from "child_process";
import { environment } from "@raycast/api";
import { useExec } from "@raycast/utils";

export function login(username: string, password: string, proxy: string, otp: string) {
  return spawnSync("sh", [`${environment.assetsPath}/scripts/login.sh`, username, password, proxy, otp], {
    env: env(),
    timeout: 15000,
  }).stdout.toString();
}

export function logout() {
  return spawnSync("tsh", ["logout"], {
    env: env(),
    timeout: 15000,
  }).stdout.toString();
}

export function serversList() {
  return useExec("tsh ls --format=json", {
    env: env(),
    shell: true,
  });
}

export function databasesList() {
  return useExec("tsh db ls --format=json", {
    env: env(),
    shell: true,
  });
}

export function applicationsList() {
  return useExec("tsh apps ls --format=json", {
    env: env(),
    shell: true,
  });
}

export function kubernetesClustersList() {
  return useExec("tsh kube ls --format=json", {
    env: env(),
    shell: true,
  });
}

export function kubernetesClustersPodsList(cluster: string) {
  return useExec(`tsh kube login ${cluster} > /dev/null && kubectl get pods --all-namespaces --output=json`, {
    env: env(),
    shell: true,
  });
}

export function connectToDatabase(connection: string, username: string, protocol: string, database: string) {
  return spawnSync(
    "sh",
    [`${environment.assetsPath}/scripts/connect-database.sh`, connection, username, protocol, database],
    { env: env(), timeout: 15000 }
  ).stdout.toString();
}

export function connectToApplication(application: string) {
  return spawnSync("sh", [`${environment.assetsPath}/scripts/connect-application.sh`, application], {
    env: env(),
    timeout: 15000,
  }).stdout.toString();
}

function env() {
  return { PATH: "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:" };
}

export function connectToServerCommand(server: string, username: string) {
  return `tsh ssh ${username}@${server}`;
}

export function kubernetesPodCommand(pod: string, namespace: string) {
  return `kubectl -n ${namespace} exec -it ${pod} -- bash`;
}

export function appleScriptTerminalCommand(terminal: string, command: string) {
  return `tell application "Finder" to activate
            tell application "${terminal}" to activate
            tell application "System Events" to tell process "${terminal}" to keystroke "t" using command down
            tell application "System Events" to tell process "${terminal}"
                delay 0.5
                keystroke "${command}"
                delay 0.5
                key code 36
            end tell`;
}

export function capitalize(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
