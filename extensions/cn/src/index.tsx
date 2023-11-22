import { useEffect, useState } from 'react';
import { runAppleScript } from "run-applescript";
import { ActionPanel, Detail, List, Action,  } from "@raycast/api";
import fs from 'fs';
import path from 'path';

export default function Command() {
    const [servers, setServers] = useState([]);

    useEffect(() => {
        // 파일 경로 설정
        const filePath = '/Users/1111831/Documents/util/cnnugu/newcn.hosts.red';

        // 파일 읽기
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error("File read failed:", err);
                return;
            }

            // 파일 내용을 줄바꿈으로 분리하고, 각 줄을 '=' 기호를 기준으로 파싱하여 서버 이름 추출
            const serverList = data.split('\n').filter(line => line && !line.startsWith('#'))
                .map(line => line.split('=')[0].trim());
            setServers(serverList);
        });
    }, []);

    const handleServerSelect = async (server) => {
        const script = `
        tell application "Terminal"
            if not (exists window 1) then
                do script
            end if
            do script "cn ${server}" in window 1
            activate
        end tell
    `;
        await runAppleScript(script);
    };


    return (
        <List>
            {servers.map((server, index) => (
                <List.Item
                    key={index}
                    icon="list-icon.png"
                    title={server}
                    actions={
                        <ActionPanel>
                            <Action title="Open in Terminal" onAction={() => handleServerSelect(server)} />
                            <Action.Push title="Show Details" target={<Detail markdown={`# Server: ${server}`} />} />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}