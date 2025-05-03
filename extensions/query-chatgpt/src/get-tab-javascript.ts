import { TabOpenerArguments } from "./types";

export function getTabJavascript(prompt: TabOpenerArguments["prompt"]): string {
  return `
window._queryChatGPT = {};

window._queryChatGPT.triggerClick = () => {
    // Find the button by its data-testid attribute
    const button = document.querySelector(\`button[data-testid='send-button']\`);

    if (button) {
      button.click();
    } else {
      console.log('Button not found');
    }
};

window._queryChatGPT.execute = () => {
  const element = Array.from(document.querySelectorAll('input, textarea, select')).find(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0,
  );

  if (element) {
    element.focus(); // Focus the element
    element.value = \`${prompt}\`;

    // Create a new 'input' event
    const event = new Event('input', { bubbles: true });

    // Dispatch it on the element
    element.dispatchEvent(event);
    window._queryChatGPT.triggerClick();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    window._queryChatGPT.execute();
  });
} else {
  // The DOMContentLoaded event has already fired
  console.log('DOMContentLoaded has already fired');
  window._queryChatGPT.execute();
}
`;
}
