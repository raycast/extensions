import { Color, Keyboard, List, Toast, showToast } from "@raycast/api";
import { exec } from "child_process";
import * as sudo from "sudo-prompt"


export default class Disk {
  
    number: number;
    identifier: string;
    size: string;
    name: string;
    details: string;
    mountStatus: string;
    type: string
    isWhole: boolean
    mointPoint: string | null;
  
    constructor(number: number, type: string, identifier: string, name: string, size: string) {
      this.number = number;
      this.identifier = identifier;
      this.name = name;
      this.size = size;
      this.type = type;
      this.mointPoint = null
      this.details = "Initializing...";
      this.mountStatus = "Initializing...";
      this.isWhole = false
    }
  
    getActions(postFunction: (string:string) => void): { title: string; shortcut?: Keyboard.Shortcut; onAction: () => void }[] {
      const action = (title: string, shortcut: Keyboard.Shortcut, method: 'mount' | 'unmount' | 'revealInFinder' | 'showDetailCustomTerminal') => ({
        title,
        shortcut,
        onAction: () => {
          this[method]()
            .finally(() => (method === 'mount' || method === 'unmount') && postFunction("DiskUpdate")); // PostFunction only with mount/unmount
        },
      });
      
  
      const failureAction = (title: string, message?: string) => ({
          title,
          onAction: () => showToast({
              style: Toast.Style.Failure,
              title: `${this.identifier} ${title}`,
              message,
          }),
      });
  
      switch (this.mountStatus) {
          case "Mounted":
              return [
                action("Unmount Disk", { modifiers: ["cmd"], key: "e" }, 'unmount'),
                action("Reval in Finder", { modifiers: ["cmd"], key: "f" }, 'revealInFinder')
              ];
          case "Unmounted":
              return [action("Mount Disk", { modifiers: ["cmd"], key: "e" }, 'mount')];
          case "Whole":
              return [
                  action("Eject All Disks", { modifiers: ["cmd"], key: "e" }, 'unmount'),
                  action("Mount All Disks", { modifiers: ["cmd", "shift"], key: "e" }, 'mount')
              ];
          case "Unmountable":
              return [failureAction("Unmountable")];
          case "Container":
            return [failureAction("Container cannot be mounted")];
          case "Timed Out":
            return [
              // Execute diskutil detail in new terminal
              action("Try in custom terminal", { modifiers: ["cmd"], key: "t" }, 'showDetailCustomTerminal'),
              action("Eject Disk", { modifiers: ["cmd"], key: "e" }, 'unmount'),
              action("Mount Disk", { modifiers: ["cmd", "shift"], key: "e" }, 'mount')
          ];
          default:
              return [
                failureAction("Mountability Unknown", "Shouldn't happen. Try reloading or so"),
                action("Eject Disk", { modifiers: ["cmd"], key: "e" }, 'unmount'),
                action("Mount Disk", { modifiers: ["cmd", "shift"], key: "e" }, 'mount')];
      }
  }

  async showDetailCustomTerminal() {
    const command = `diskutil info ${this.identifier}`;
  
    // Execute AppleScript to open a new Terminal window and run the command
    const fullCommand = `
      osascript -e 'tell application "Terminal"
        activate
        do script "${command}"
        delay 1000
        set frontmost of the first window to true
      end tell'
    `;

    showToast({
      style: Toast.Style.Animated,
      title: `Opening new terminal...`,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000)); // delay
    showToast({
      style: Toast.Style.Success,
      title: `Opened new terminal`,
    });
    Disk.execCommand(fullCommand);   
  }
  
  
  async revealInFinder() {
      try {
        await Disk.execCommand(`open "${this.mointPoint}"`);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Reveal in Finder Error",
          message: error as string,
        });
    }
  } 
  
  async handleMountAction(isMount: boolean) {
    const action = isMount ? 'mount' : 'unmount';
    const diskAction = this.isWhole ? `${action}Disk` : action;
    const command = `diskutil ${diskAction} ${this.identifier}`;
    this.showToast(action + 'ing', '', Toast.Style.Animated);
    
    try {
    const output = await this.tryCommandWithoutSudo(command)
    this.showToast(action+'ed', output, Toast.Style.Success);
    } catch (error) {
      this.showToast(action+'ed', error as string, Toast.Style.Failure);
    }
  }

  isDetailsTimedOut(): Boolean {
    return this.details.includes("ERROR: Initialization Timed Out")
  }
  
  
  private async tryCommandWithSudo(command: string): Promise<string> {
    showToast({style: Toast.Style.Animated, title: `Trying with sudo...`});
    await new Promise((resolve) => setTimeout(resolve, 300)); // delay
    return Disk.execCommandWithSudo(command);
  }
  
  private async tryCommandWithoutSudo(command: string): Promise<string> {
    try {
      return await Disk.execCommand(command);
    } catch (error) {
      if (String(error).includes('kDAReturnNotPermitted')) { // All EFI paritions
        return this.tryCommandWithSudo(command);
      } else {
        throw error;
      }
    }
  }
  
  private showToast(action: string, message: string, style: Toast.Style): void {
    showToast({
      style,
      title: `${this.identifier} ${this.isWhole ? 'All possible disks' : ''} ${action.charAt(0).toUpperCase() + action.slice(1)}${style === Toast.Style.Failure ? '-Error' : ''}`,
      message: message,
    });
  }
    
    async unmount() {
      await this.handleMountAction(false);
    }
    
    async mount() {
      await   .handleMountAction(true);
    }
    
    async init(): Promise<void> {
      try {
        const detailsPromise = this.fetchDetails();
        const timeoutPromise = new Promise((resolve, _reject) => {
          setTimeout(() => {
            //accept
            resolve("ERROR: Initialization Timed Out " + this.identifier);
          }, 5000); // 5 seconds timeout
        });
        
        this.details = String(await Promise.race([detailsPromise, timeoutPromise]));
        
        this.initMountStatus();    
        this.initDetails();
      } catch (error) {
        this.details = "Error initializing: " + error;
      }
    }
    
    async fetchDetails(): Promise<string> {
      let details: string = "";
  
      const output = await Disk.execCommand("diskutil info " + this.identifier);
      details = output
  
      return details;
    }
  
    initMountStatus() {
      const mountStatusRegex = /Mounted:\s+([^\n]+)/;
      const match = this.details.match(mountStatusRegex);
      const isWhole = this.details.match(/Whole.+Yes/);
      const isApfsContainer = this.name.includes("Container")

      if (this.isDetailsTimedOut()) {
        this.mountStatus = "Timed Out";
        return;
      }
    
      if (isWhole) {
        this.isWhole = true;
        this.mountStatus = "Whole";
        return;
      }
    
      if (!match) {
        this.mountStatus = "Inaccessible";
        return;
      }
  
      if (isApfsContainer) {
        this.mountStatus = "Container"
        return
      }
    
      switch (match[1].trim()) {
        case 'Yes':
          this.mountStatus = "Mounted";
          break;
        case 'No':
          this.mountStatus = "Unmounted";
          break;
        default:
          this.mountStatus = "Unmountable";
      }
    }
  
    initDetails() {
      const mountPointRegex = /Mount Point:(.*?(\/.+))/;
      const match = this.details.match(mountPointRegex);
      
      if (match && match[2]) {
        this.mointPoint = `${match[2].trim()}`;
      } else {
        this.mointPoint = null;
      }
    }
    
  
  getMountStatusAccessory() {
    let color
    
    switch (this.mountStatus) {
      case "Mounted":
        color = Color.Green;
        break;
      case "Unmounted":
        color = Color.Red;
        break;
      case "Unmountable":
        color = Color.Orange;
        break;
      case "Whole":
        color = Color.Purple;
        break;
      case "Container":
        color = Color.Blue
        break;
      default:
        color = Color.Magenta;
    }
    
    return { tag: { value: this.mountStatus, color } };
  }
  
  getFormattedSize() {
    const spaceCount = 50 - (this.name.length + this.identifier.length);
    const spaces = "\u00A0".repeat(spaceCount); // Use non-breaking space character for fixed-width spacing
    const formattedSize = `${spaces}${this.size}`;
    return formattedSize;
  }  
  
  
  getDetails(): JSX.Element {
    const data = this.parseTextToDict(this.details);
    //console.log(data.toString())
    return (
      <List.Item.Detail.Metadata>
        {data.flatMap(([key, value], index) => [
          <List.Item.Detail.Metadata.Label key={`${key}-${index}`} title={key} text={value || undefined} />,
          value === null && <List.Item.Detail.Metadata.Separator key={`separator-${index}`} />,
        ])}
      </List.Item.Detail.Metadata>
    );
  }
  
  
    parseTextToDict(text: string): [string, string | null][] {
      const results: [string, string | null][] = [];
      const regex = /(.+): +(.+$)|(.+)/gm;
    
      for (const match of text.matchAll(regex)) {
        if (match[1] && match[2]) {  // this is a key-value pair
          //console.log(match[2])
          const key = match[1].trim();
          const value = match[2].trim();
          results.push([key, value]);
        } else if (match[3]){  // this is a heading
          //console.log(match)
          results.push([match[3].trim(), null]);
        }
      } 
  
      return results;
    }
    
    static execCommand(command: string): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
    }
  
    private static async execCommandWithSudo(command: string): Promise<string> {
      return new Promise((resolve, reject) => {
        const options = {
          name: 'Raycast Disk',
        };
        
        sudo.exec(command, options, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout?.toString() || ''); // convert stdout to string
          }
        });
      });
    }  
  
    static createFromString(string: string): Disk | null {
      string = string.replace(/⁨|⁩/g, "");
      const regex = /^ +(\d+):(.{27}) (.{21}.*?)([\+|\d].+B)(.+)$/gm;
      const matches = string.matchAll(regex);
      const disks: Disk[] = [];
  
      for (const match of matches) {
        const number = parseInt(match[1]);
        const type = match[2].trim()
        const name = match[3].trim()
        const size = match[4].trim()
        const identifier = match[5].trim()
  
        
        const disk = new Disk(number, type, identifier, name, size);
        disks.push(disk);
      }
  
      if (disks.length === 0) {
        return null;
      }
  
      return disks[0];
    }
  }