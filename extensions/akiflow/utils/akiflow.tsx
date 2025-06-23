import axios from 'axios';
import { AxiosResponse } from 'axios';
import { exec } from 'child_process';
import { runAppleScript } from '@raycast/utils';
import { closeMainWindow } from '@raycast/api';

interface Task {
    title?: string;
    description?: string;
    id?: string;
    date?: string;
    datetime?: string;
    duration?: number;
    priority?: number;
    listId?: string;
    done?: boolean;
    status?: number;
    due_date?: string;
    tagsIds?: string[];
}

interface Project {
    title: string;
    color: string;
    parentId: string | null;
    icon: string;
}

export const colorMap: { [key: string]: string } = {
    "palette-blue": "#007BFF",        
    "palette-violet": "#8A2BE2",      
    "palette-orange": "#FFA500",      
    "palette-wildwillow": "#31BF75",  
    "palette-red": "#FF0000",         
    "palette-comet": "#A9A9A9",       
    "palette-grey": "#808080",        
    "palette-yellow": "#FFFF00",      
    "palette-pink": "#FFC0CB",        
    "palette-purple": "#800080",      
    "palette-mauve": "#E0B0FF",       
    "palette-cyan": "#00FFFF",        
    "palette-green": "#008000",       
    "palette-chico": "#D1A6A1",       
    "palette-brown": "#A52A2A",       
    "palette-finn": "#5F1C3A"
};

export class Akiflow {
    private refreshToken: string;
    private tokenPromise: Promise<string | void>;
    public projectsPromise: Promise<string | void>;
    public tagsPromise: Promise<string | void>;
    private tasks_url = 'https://api.akiflow.com/v3/tasks';
    private projects_url = 'https://api.akiflow.com/v3/labels';
    private tags_url = 'https://api.akiflow.com/v3/tags';
    private events_url = 'https://api.akiflow.com/v3/events';
    private token: string = '';
    private headers = {
        'Akiflow-Platform': 'mac',
        'Authorization': '', // Will be set after getting the token
        'Referer': 'https://web.akiflow.com/app/stable/e89ffa149c8786fb/static/js/21.chunk.js',
        'Akiflow-Client-Id': 'b4edaac3-5dc7-4b20-bf58-de51efc2bec4',
        'Akiflow-Version': '2.45.20',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'DNT': '1',
        'Content-Type': 'application/json'
    };
    public projects: Record<string, Project> = {};
    public tags: Record<string, string> = {};

    constructor(refreshToken: string) {
        this.refreshToken = refreshToken;
        this.tokenPromise = this.getToken(refreshToken).then(authtoken => {
            this.token = authtoken
            this.headers.Authorization = `Bearer ${this.token}`;
        });
        this.projectsPromise = this.refreshProjects();
        this.tagsPromise = this.refreshTags();
    }

    private async getToken(refreshToken: string): Promise<string> {
        const url = 'https://web.akiflow.com/oauth/refreshToken';
        // Define the headers as an object
        const headers = {
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Akiflow-Version': '2.45.20',
            'Content-Type': 'application/json',
        };

        const data = {
            client_id: "10",
            refresh_token: refreshToken,
        };

        try {
            // Send the POST request
            const response = await axios.post(url, data, { headers });

            // Check if the response status is 200
            if (response.status === 200) {
                return response.data.access_token;
            } else {
                console.error(`Error: ${response.status}`);
                return "null";
            }
        } catch (error) {
            console.error('Error during token refresh:', error);
            return "null";
        }
    }

    private async makeRequest(url: string, method: string, body?: any): Promise<any> {
        await this.tokenPromise;
        const response: AxiosResponse = await axios.request({
            url,
            method,
            headers: this.headers,
            data: body
        });
        return response.data;
    }

    private validateParameters(parameterName: string, value: any): void {
        const parametersTypesDict: Record<string, string> = {
            title: "string",
            description: "string",
            id: "string",
            duration: "number",
            priority: "number",
            listId: "string",
            done: "boolean",
            status: "number",
            date: "string",
            datetime: "string",
            due_date: "string",
            tags_ids: "object"
        };

        if (!(parameterName in parametersTypesDict)) {
            throw new Error(`Invalid parameter: ${parameterName}`);
        }

        if (typeof value !== parametersTypesDict[parameterName]) {
            throw new TypeError(`Invalid type for parameter: ${parameterName}. Expected type: ${parametersTypesDict[parameterName]}. Actual type: ${typeof value}`);
        }

        if (parameterName === "priority" && ![99, -1, 1, 2, 3].includes(value)) {
            throw new Error(`Invalid priority value: ${value}. Valid values are: -1 (Goal), 1 (High), 2 (Medium), 3 (Low)`);
        }

        if (parameterName === "status" && ![1, 2, 4, 7].includes(value)) {
            throw new Error(`Invalid status value: ${value}. Valid values are: 1 (Inbox), 2 (Planned), 4 (Snoozed), 7 (Someday)`);
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;

        if (parameterName === "date" && !dateRegex.test(value)) {
            throw new Error(`Invalid date format: ${value}. Expected format: YYYY-MM-DD`);
        }

        if (parameterName === "datetime" && !datetimeRegex.test(value)) {
            throw new Error(`Invalid datetime format: ${value}. Expected format: YYYY-MM-DDTHH:MM:SS±HH:MM`);
        }

        if (parameterName === "due_date" && !dateRegex.test(value)) {
            throw new Error(`Invalid due_date format: ${value}. Expected format: YYYY-MM-DD`);
        }
    }

    public async addSingleTask(task: Task): Promise<any> {
        // await this.tokenPromise;
        if (!task.title && !task.id) {
            throw new Error("Title or ID is required");
        }

        const data: any = {};
        Object.entries(task).forEach(([key, value]) => {
            this.validateParameters(key, value);
            data[key] = value;
        });
        console.log(data);
        return await this.makeRequest(this.tasks_url, 'POST', data);
    }

    public async markTaskAsDone(taskId: string): Promise<any> {
        const data: any = { done: true };
        data.id = taskId;
        return await this.makeRequest(this.tasks_url, 'POST', data)
    }

    public async addTasks(tasks: Task[]): Promise<any> {
        if (!Array.isArray(tasks)) {
            throw new TypeError("'tasks' must be a list");
        }
        if (tasks.length === 0) {
            throw new Error("List of tasks is empty");
        }
        if (!tasks.every(task => typeof task === 'object')) {
            throw new TypeError("All items in 'tasks' must be dictionaries");
        }

        const data: Task[] = [];
        for (const task of tasks) {
            const taskData = await this.addSingleTask(task);
            data.push(taskData);
        }

        return await this.makeRequest(this.tasks_url, 'POST', data);
    }

    public async getTasks(withDeleted: boolean = false): Promise<any> {
        const url = `${this.tasks_url}?per_page=2500`;
        return await this.makeRequest(url, 'GET');
    }

    public async getEvents(withDeleted: boolean = false): Promise<any> {
        const url = `${this.events_url}?per_page=2500`;
        return await this.makeRequest(url, 'GET');
    }

    public async refreshTags(): Promise<void> {
        const response = await this.makeRequest(this.tags_url, 'GET');
        const tags = response.data;
        for (const tag of tags) {
            if (tag.deleted_at === null) {
                const cleanedTag = tag.title.replace(/[^\w\s]/g, '').trim();
                this.tags[cleanedTag] = tag.id;
            }
        }
    }

    public async refreshProjects(): Promise<void> {
        const response = await this.makeRequest(this.projects_url, 'GET');
        const projects = response.data;
        this.projects = {}; // Reset the projects object
        for (const project of projects) {
            if (project.deleted_at === null) {
                this.projects[project.id] = {
                    title: project.title,
                    color: colorMap[project.color], 
                    parentId: project.parent_id,
                    icon: project.icon,
                };
            }
        }
    }
    
}

export function openInAkiflow(thingToOpen: string) {
    closeMainWindow();
    exec('open -a "Akiflow.app"');
    runAppleScript(`
        tell application "Akiflow" to activate
        tell application "System Events"
        keystroke "k" using command down
        delay 0.25
        keystroke "go to"
        delay 0.25
        keystroke return
        delay 0.25
        keystroke "${thingToOpen}"
        delay 0.25
        keystroke return
        end tell`
    )   
}

export function openAkiflow() {
    closeMainWindow();
    exec('open -a "Akiflow.app"');
}


export function viewTaskInAkiflow(taskName: string) {
    closeMainWindow();
    let cleanedTaskTitle = taskName.replace(/[\u200B\u200C\u200D\u200E\u200F\u2060]/g, '');
    for (let i = 0; i < taskName.length; i++) {
        console.log(`Character at ${i}: '${taskName[i]}' (Code: ${taskName.charCodeAt(i)})`);
    }
    console.log(taskName.length);
    console.log("first character: '" + taskName[0] + "'");
    console.log(cleanedTaskTitle == taskName ? "there was no issue" : "zero width space found!")
    exec('open -a "Akiflow.app"');
  
    runAppleScript(
      `
      on run {theName}
        tell application "Akiflow" to activate
        delay 0.5                          -- let the window become key
  
        tell application "System Events"
          -- Cmd-F sent as a key code (3 = "f" on US keyboard)
          key code 3 using {command down}
          delay 0.35                       -- let the search field appear
  
          -- Type the task name exactly
          keystroke theName
        end tell
      end run
      `,
      [cleanedTaskTitle]                           // argument list for the script
    );
//   }

// export function viewTaskInAkiflow(taskName: string) {
//   closeMainWindow();
//   exec('open -a "Akiflow.app"');

//   // Raycast: second argument is options; we ask for 15-second budget
//   runAppleScript(
//     `
//     on run {theName}
//       my ensureAppIsReady("Akiflow")
//       my openSearchAndType(theName)
//     end run

//     -- Wait until the application process is frontmost (maxWait seconds)
//     on ensureAppIsReady(appName)
//       tell application appName to activate

//       set maxWait to 5
//       set t0 to (current date)
//       tell application "System Events"
//         repeat until frontmost of application process appName is true
//           if (current date) - t0 > maxWait then
//             error "Timed out: " & appName & " never became frontmost"
//           end if
//           delay 0.05
//         end repeat
//       end tell
//     end ensureAppIsReady

//     -- Press Cmd-F and type the task name
//     on openSearchAndType(theName)
//       tell application "System Events"
//         key code 3 using {command down} -- Cmd-F

//         -- wait until some control in Akiflow has focus (max 5 s)
//         set maxWait to 5
//         set t0 to (current date)
//         set targetProc to application process "Akiflow"
//         repeat until (exists (first UI element of targetProc whose focused is true))
//           if (current date) - t0 > maxWait then
//             error "Timed out: search field never got focus"
//           end if
//           delay 0.05
//         end repeat

//         -- ready → type
//         keystroke theName
//       end tell
//     end openSearchAndType
//     `,
//     [taskName], { timeout: 15_000 }   // 15 000 ms total budget
//   );
}