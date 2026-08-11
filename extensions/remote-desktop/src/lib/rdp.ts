import { runPowerShellScript } from "@raycast/utils";

export interface RdpConnection {
  Hostname: string;
  UsernameHint?: string;
}

interface RdpConnectionsResult {
  connections: RdpConnection[];
  recentServers: string[];
}

export async function getRecentRdpConnections(): Promise<RdpConnection[]> {
  const data = await runPowerShellScript(
    `
    function Get-RemoteDesktopServers {
        $rdbPath = 'HKCU:\\SOFTWARE\\Microsoft\\Terminal Server Client\\Servers'
        $connections = @()

        try {
            if (-not (Test-Path $rdbPath)) {
                return @()
            }

            Get-ChildItem -Path $rdbPath -ErrorAction Stop | ForEach-Object {
                $serverKey = $_.PSChildName
                $serverPath = Join-Path $rdbPath $serverKey

                $usernameHint = $null
                try {
                    $props = Get-ItemProperty -Path $serverPath -ErrorAction Stop
                    $usernameHint = $props.UsernameHint
                } catch {
                    # UsernameHint may not exist – ignore
                }

                $connections += [pscustomobject]@{
                    Hostname     = $serverKey
                    UsernameHint = $usernameHint
                }
            }
        }
        catch {
            # optional logging
            # Write-Error $_
            return @()
        }

        return $connections
    }

    function Get-RecentRdpServerNames {
        $defaultPath = 'HKCU:\\SOFTWARE\\Microsoft\\Terminal Server Client\\Default'
        $servers = @()

        try {
            if (-not (Test-Path $defaultPath)) {
                return @()
            }

            $props = Get-ItemProperty -Path $defaultPath -ErrorAction Stop

            foreach ($prop in $props.PSObject.Properties) {
                if (
                    $prop.MemberType -ne 'NoteProperty' -or
                    $prop.Name -notlike 'MRU*'
                ) {
                    continue
                }

                $value = $prop.Value
                if ($value -is [string] -and $value.Trim()) {
                    $servers += $value
                }
            }
        }
        catch {
            # optional logging
            # Write-Error $_
            return @()
        }

        return $servers
    }


    $connections = Get-RemoteDesktopServers
    $recentServers = Get-RecentRdpServerNames

    $result = [pscustomobject]@{
        connections   = $connections
        recentServers = $recentServers
    }


    ConvertTo-Json $result

    `,
  );
  const cons = JSON.parse(data) as RdpConnectionsResult;
  const primary: RdpConnection[] = [];
  for (const recent of cons.recentServers) {
    const found = cons.connections.find((c) => c.Hostname === recent);
    if (found) {
      primary.push(found);
    }
  }

  const secondary = cons.connections.filter((c) => !primary.find((h) => h.Hostname === c.Hostname));

  return [...primary, ...secondary];
}
