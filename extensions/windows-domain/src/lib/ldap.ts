import { runPowerShellScript } from "@raycast/utils";

export interface LDAPUser {
  path: string;
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
