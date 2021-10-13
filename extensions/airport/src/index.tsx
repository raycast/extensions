import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

export default function ArticleList() {
  const [state, setState] = useState<{ apps: App[] }>({ apps: [] });

  useEffect(() => {
    async function fetch() {
      showToast(ToastStyle.Animated, "Loading Apps");
      const apps = await fetchArticles();
      setState((oldState) => ({
        ...oldState,
        apps: apps,
      }));
      showToast(ToastStyle.Success, "Fetched Latest Apps");
    }
    fetch();
  }, []);

  return (
    <List isLoading={state.apps.length === 0} searchBarPlaceholder="Filter apps by name...">
      {state.apps.map((app) => (
        <ArticleListItem key={app.id} app={app} />
      ))}
    </List>
  );
}

function ArticleListItem(props: { app: App }) {
  const app = props.app;

  return (
    <List.Item
      id={app.id}
      key={app.id}
      title={app.name}
      subtitle={app.description}
      icon={{ source: app.icon }}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={`https://app.airport.community/app/${app.id}`} />
          <CopyToClipboardAction title="Copy URL" content={`https://app.airport.community/app/${app.id}`} />
        </ActionPanel>
      }
    />
  );
}

async function fetchArticles(): Promise<App[]> {
  try {
    const response = await fetch("https://app.airport.community/api/apps");
    const json: any = await response.json();
    return json.apps.all as App[];
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load articles");
    return Promise.resolve([]);
  }
}

type Article = {
  id: string;
  title: string;
  url: string;
  date_modified: string;
};

// import {
//   Form,
//   List,
//   OpenInBrowserAction,
//   CopyToClipboardAction,
//   showHUD,
//   FormValue,
//   ActionPanel,
//   SubmitFormAction,
//   showToast,
//   ToastStyle,
//   Detail,
// } from "@raycast/api";

// import axios, { AxiosResponse } from "axios";

// import { useEffect, useState } from "react";

interface App {
  id: string;
  name: string;
  icon: string;
  categories: string;
  description: string;
  status: string;
  platform: string;
}

// export default function Command() {
//   function handleSubmit(values: Record<string, FormValue>) {
//     console.log(values);
//     showToast(ToastStyle.Success, "Submitted form", "See logs for submitted values");
//   }

//   const fetchApps = async () => {
//     const result: any = (await axios.get("https://app.airport.community/api/apps")).data;
//     setApps(result?.apps.all.sort);
//     console.log(apps);
//   };

//   const [apps, setApps] = useState<App[] | null>(null);
//   useEffect(() => {
//     fetchApps();
//     return () => {
//       fetchApps;
//     };
//   }, []);

//   return (
//     <>
//       <List isLoading={!apps} navigationTitle="Open Pull Requests">
//         <List.Section title="Apps">
//           {apps?.map((app) => (
//             <List.Item
//               title={app.name}
//               subtitle={app.description}
//               actions={
//                 <ActionPanel title="Open on Airport">
//                   <OpenInBrowserAction url={`https://app.airport.community/app/${app.id}`} />
//                 </ActionPanel>
//               }
//             />
//           ))}
//         </List.Section>
//       </List>
//     </>
//   );
// }
