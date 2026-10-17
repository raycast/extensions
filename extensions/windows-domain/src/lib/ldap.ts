import { runPowerShellScript } from "@raycast/utils";

export interface LDAPUser {
  _path: string;
  displayname?: string;
  mail?: string;
  telephonenumber?: string;
  samaccountname?: string;
  department?: string;
  title?: string;
  employeenumber?: string;
  mobile?: string;
  company?: string;
  pwdlastset?: string;
  thumbnailphoto?: string;
  whencreated?: string;
  pwdLastSet?: string;
}

async function ldapQueryUsers({ filter }: { filter: string; imageCacheDirectory?: string }) {
  const data = await runPowerShellScript(
    `
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $DomainController = ([System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()).PdcRoleOwner.Name

        $directoryEntry = New-Object System.DirectoryServices.DirectoryEntry("LDAP://$DomainController")

        # Create a DirectorySearcher object
        $searcher = New-Object System.DirectoryServices.DirectorySearcher
        $searcher.SearchRoot = $directoryEntry
        $searcher.Filter = "${filter}"
        $searcher.PageSize = 1000  # Set the page size to 1000 (you can adjust this if needed)

        # Add properties to load
        $fields = @("displayname", "mail", "telephonenumber", "samaccountname", "department", "title", "employeenumber",
                    "mobile", "company", "pwdlastset", "thumbnailphoto", "whencreated")
        foreach($f in $fields){
            $searcher.PropertiesToLoad.Add($f) | Out-Null
        }

        $searchResults = $searcher.FindAll()
        $res = @()
        foreach ($result in $searchResults) {
            $object = @{}
            $object["_path"] = $result.Path
            foreach($f in $fields){
                $p = $result.Properties[$f][0]
                if($p){
                    if($p -is [byte[]]){
                        #$p = "data:image/png;base64," + [System.Convert]::ToBase64String($p)
                        $p = [System.Convert]::ToBase64String($p)
                    }
                    if($p -is [System.DateTime]){
                        $p = ([DateTimeOffset]$p).ToUnixTimeSeconds()
                    }
                    $object[$f] = $p.toString()
                }
            }
            $res += $object
        }
        ConvertTo-Json $res
        `,
  );
  const raw = JSON.parse(data) as LDAPUser[];

  return raw.map<LDAPUser>((u) => ({
    ...u,
    thumbnailphoto: u.thumbnailphoto ? `data:image/jpg;base64,${u.thumbnailphoto}` : "",
  }));
}

export async function getLDAPUsers({ searchQuery }: { searchQuery: string | undefined }) {
  const wildCard = searchQuery ? `*${searchQuery}*` : "";
  return await ldapQueryUsers({
    filter: `(&(objectClass=user)(mail=*)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(cn=${wildCard}))`,
  });
}

export async function getDomainUserAccountInfo({ username }: { username: string }) {
  const result = await ldapQueryUsers({
    filter: `(&(objectClass=user)(mail=*)(samaccountname=${username}))`,
  });
  if (result.length <= 0) {
    throw new Error("User not found");
  }
  return result[0];
}

export function ldapDatetimeToDate(ldapDateString: string): Date {
  const ldapTimestamp = parseInt(ldapDateString, 10);
  return new Date(ldapTimestamp * 1000);
}

/**
 * Convert an LDAP/FILETIME 100-nanosecond timestamp to a Date.
 * @param timestamp 100-nanosecond intervals since January 1, 1601 (or null/undefined)
 * @returns Date in UTC or null if input is null/undefined
 */
export function convertLDAP100NanoSecondsToDateTime(timestamp: number | null | undefined): Date | null {
  if (timestamp == null) return null;

  // FILETIME to UNIX epoch offset (number of 100-ns intervals between 1601-01-01 and 1970-01-01)
  const fileTimeToUnixEpochOffset = 116444736000000000n; // use BigInt for safety

  // Work with BigInt to avoid losing precision for large 64-bit FILETIME values
  const tsBig = BigInt(timestamp);

  // Convert 100-ns intervals to milliseconds: divide by 10_000 (10000)
  const msSinceEpoch = (tsBig - fileTimeToUnixEpochOffset) / 10000n;

  // Convert BigInt milliseconds to number for Date. If out of safe range, clamp to Number.MAX_SAFE_INTEGER/ MIN_SAFE_INTEGER
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  const minSafe = BigInt(Number.MIN_SAFE_INTEGER);
  let msNumber: number;
  if (msSinceEpoch > maxSafe) {
    msNumber = Number.MAX_SAFE_INTEGER;
  } else if (msSinceEpoch < minSafe) {
    msNumber = Number.MIN_SAFE_INTEGER;
  } else {
    msNumber = Number(msSinceEpoch);
  }

  // Date expects milliseconds since Unix epoch (UTC)
  return new Date(msNumber);
}

interface DomainPasswordPolicy {
  maxPwdAgeSeconds: number;
}

export async function getDomainUserPasswordExpireTimeInSeconds(): Promise<number> {
  const data = await runPowerShellScript(`
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    # Retrieve domain policy for password settings
    $DomainController = ([System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()).PdcRoleOwner.Name
    $directoryEntry = New-Object System.DirectoryServices.DirectoryEntry("LDAP://$DomainController")

    # Retrieve the domain password policy
    $domainPolicy = New-Object System.DirectoryServices.DirectorySearcher
    $domainPolicy.SearchRoot = $directoryEntry
    $domainPolicy.Filter = "(objectClass=domainDNS)"
    $domainPolicy.PropertiesToLoad.Add("maxPwdAge") | Out-Null
    $domainResults = $domainPolicy.FindOne()

    # Get the maxPwdAge property (returned as a large integer -100 nanoseconds intervals)
    $maxPwdAge = $domainResults.Properties["maxpwdage"][0]

    # Convert maxPwdAge to days
    $maxPwdAgeSeconds = ([Math]::Abs($maxPwdAge) / 10000 / 1000)

    ConvertTo-Json @{
      maxPwdAgeSeconds = $maxPwdAgeSeconds
    }
    `);
  const raw = JSON.parse(data) as DomainPasswordPolicy;
  return raw.maxPwdAgeSeconds;
}
