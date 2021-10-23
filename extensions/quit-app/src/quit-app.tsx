import { ActionPanel, Color, Icon, List, ToastStyle, getApplications, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { getOSRunninApps, quitAppById } from './OS';

interface Application {
  bundleId: string;
  name: string;
  path: string;
};

export default function quitApp()  {

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  const { pop } = useNavigation();

  async function getRunningApps() {
    setLoading(true)

    try {
      const output = await getOSRunninApps();
      const runningApps = output.split(', ') as string[];
      const allApplications = await getApplications() as Application[];
      const appIsRunning = (app: Application) => runningApps.includes(app.bundleId);
      const newApplications = allApplications.filter(appIsRunning);
  
      setApplications(newApplications);
    }

    catch(error) {
      await showToast(ToastStyle.Failure, "Error reading running apps");
    }

    setLoading(false);
  }; 

  useEffect(() => {
    getRunningApps();
  }, []);

  const quit = async (app: Application) => {
    try {
      await quitAppById(app.bundleId);
      await showToast(ToastStyle.Success, `${app.name} quit`, app.bundleId);
    } 
    catch(error) {
      await showToast(ToastStyle.Failure, "Something went wrong");
    }

    pop();
  };

  return (
    <List isLoading={ loading }>
      {applications.map((app) => (
        <List.Item 
          key={ app.bundleId } 
          title={ app.name }
          subtitle={ app.bundleId }
          icon="../assets/quit-app-icon.png"
          actions={
            <ActionPanel>
              <ActionPanel.Item 
                title={`Quit ${ app.name }`} 
                icon="../assets/quit-app-icon.png"
                onAction={() => quit(app)} 
              ></ActionPanel.Item>
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
};
