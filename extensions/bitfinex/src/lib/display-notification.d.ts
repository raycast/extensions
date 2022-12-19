declare module "display-notification" {
  interface DisplayNotificationOptions {
    title?: string;
    text?: string;
    subtitle?: string;
    sound?: string;
  }

  export default async function displayNotification(options: DisplayNotificationOptions): Promise<void>;
}
