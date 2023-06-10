enum AppIcons {
  Zoom = "zoom.png",
  Teams = "teams.png",
  Meet = "meet.png",
  Generic = "generic.png",
}

enum SupportedApps {
  Zoom = "Zoom",
  Teams = "Microsoft Teams",
  Meet = "Google Meet",
  Generic = "Generic",
}

type Room = {
  url: string;
  name: string;
  app: SupportedApps;
  icon: AppIcons;
};

export { SupportedApps, AppIcons };

export type { Room };
