chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const currentTab = tabs[0];
    const currentUrl = currentTab.url;
  
    const hostName = "localhost"; // 替换为你的Native Messaging主机名
  
    const port = await navigator.navigator.messaging.connect({ name: hostName });
    port.postMessage({ type: "currentUrl", payload: { url: currentUrl } });
  });