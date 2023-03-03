import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { exec } from 'child_process';
import { homedir } from 'os';
import { promisify } from 'util';
import path = require('path');

const execp = promisify(exec);

export interface ExecResult {
    stdout: string;
    stderr: string;
}

interface Preference {
    command: string | null
}

function GetProfiles()
{
    const fs = require('fs');
    const ini = require('ini');
    const awsconfigfile = path.join(homedir(), '/.aws/config');
    const profiles = ini.parse(fs.readFileSync(awsconfigfile, 'utf-8'))

    return profiles
}

async function ExecCmd(cmd: string): Promise<ExecResult> {
    try {
      return await execp(cmd);
    } catch (err) {
        console.log(err)
        throw err;
    }

}

async function OpenAssumeConsole(profile: string) {
    const preference = getPreferenceValues<Preference>();
    const regex = /<profile>/i;

    var cmd: string| null = preference.command
    if (cmd != null)  {
        cmd = cmd.replace(regex, profile);
        ExecCmd(cmd)
    } else {
        showToast(Toast.Style.Failure, "Error: No command defined");
    }
}

function ProfileListItem(props: {title: string, accessories: List.Item.Accessory[], profile: string}) {
    return (
      <List.Item
        icon="list-icon.png"
        title={props.title}
        accessories={props.accessories}
        actions={
          <ActionPanel>
            <Action title="" onAction={ () => { OpenAssumeConsole(props.profile) }} />
          </ActionPanel>
        }
      />
    )
}

export default function Command() {
    const list = [];
    let profiles = GetProfiles();

    for (const header in profiles) {
        if (header != 'default') {
            const prof = header.replace('profile ', '')
            let title=""
            let a: List.Item.Accessory[] = []
            if ("sso_account_name" in profiles[header]) {
                title=profiles[header].sso_account_name 
            } else {
                title=header.replace(/^profile /, "")
            }
            if ("sso_account_id" in profiles[header]) {
                title=title+" (" + profiles[header].sso_account_id + ")"
                a.push({text: profiles[header].sso_account_id})
            }
            if ("sso_role_name" in profiles[header]) {
                a.push({text: profiles[header].sso_role_name})
            }
            if ("region" in profiles[header]) {
                a.push({text: profiles[header].region})
            } else if ("sso_region" in profiles[header] ) {
                a.push({text: profiles[header].sso_region})
            }
            list.push(<ProfileListItem key={prof} profile={prof} title={title} accessories={a}/>);
        }
    }

    return (<List>{list}</List>);
}
