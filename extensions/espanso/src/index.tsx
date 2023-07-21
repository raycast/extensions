import { ActionPanel, Action, List, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { $, ProcessOutput } from "zx";

const noContentMd = `# No Espanso Expansion Rules Detected

We've noticed that you haven't created any expansion rules in Espanso yet. Espanso works by replacing keywords with longer phrases, making your typing faster and more efficient.

To start using Espanso, you need to create at least one rule. This can be done by following these steps:

1. Open Espanso's configuration file (default.yml) in your text editor.

2. Add a rule in the following format:
\`\`\`
   - trigger: ":keyword"
     replace: "The phrase you want to expand to."
\`\`\`

3. Save the configuration file and restart Espanso.

For more detailed instructions, please refer to the official Espanso documentation at https://espanso.org/docs/.

Remember, the power of Espanso comes from its customizability. Make it work for you!`;

const commandNotFoundMd = `# Espanso Command Not Found

It seems like the Espanso command-line tool is not currently installed on your system. Espanso is necessary for creating and managing text expansion rules to streamline your typing.

Please follow these steps to install Espanso:

For MacOS:

1. Open Terminal.

2. Install Homebrew by pasting the following command and pressing Enter:
\`\`\`
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
\`\`\`
3. Once Homebrew is installed, paste the following command to install Espanso:
\`\`\`
brew install espanso
\`\`\`
4. Verify the installation by typing \`espanso\` in the terminal. If the installation was successful, you'll see information about how to use Espanso.

For Windows:
1. Download the latest Espanso installer from the official website: https://espanso.org/install/
2. Run the installer and follow the on-screen instructions.
3. Verify the installation by opening PowerShell and typing \`espanso\`. If the installation was successful, you'll see information about how to use Espanso.

For Linux:
1. Open Terminal.
2. Depending on your distribution, use the appropriate command to install Espanso. For example, on Debian-based distributions (like Ubuntu), you'd use:
\`\`\`
sudo apt install espanso
\`\`\`
3. Verify the installation by typing \`espanso\` in the terminal. If the installation was successful, you'll see information about how to use Espanso.

Remember to restart your computer after the installation process. If you need more detailed instructions, please refer to the official Espanso installation guide at https://espanso.org/install/.
`;

interface EspansoMatch {
  triggers: string[];
  replace: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<EspansoMatch[]>([]);
  const [error, setError] = useState<ProcessOutput | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { stdout: result } = await $`espanso match list -j`;
        let matches: EspansoMatch[] = JSON.parse(result);
        matches = matches.sort((a, b) => a.triggers[0].localeCompare(b.triggers[0]));
        setItems(matches);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof ProcessOutput ? err : null);
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (error) {
    const notFound = Boolean(error.stderr.match("command not found"));

    return notFound ? <Detail markdown={commandNotFoundMd} /> : <Detail markdown={error.stderr} />;
  }

  if (!isLoading && items.length === 0) {
    return <Detail markdown={noContentMd} />;
  }

  return (
    <List isShowingDetail isLoading={isLoading}>
      {items.map(({ triggers, replace }, index) => (
        <List.Item
          key={index}
          title={triggers.join(", ")}
          detail={<List.Item.Detail markdown={replace} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Content" content={replace} />
              <Action.CopyToClipboard title="Copy Triggers" content={triggers.join(", ")} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
