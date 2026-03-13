export type Preferences = {
  farragoDataDir: string;
  oscRemoteHost: string;
  oscRemotePort: string;
  oscLocalHost: string;
  oscLocalPort: string;
  shortcutTitleTemplate: string;
};

export type DBSoundSet = Omit<SoundSet, "tiles"> & { tiles: SoundSetTile["tileUUID"][] };

export type DBSoundTile = SoundSetTile & {
  set: Pick<SoundSet, "uuid" | "mode" | "position">;
};

export type TileCoordinates = { setPosition: number; tilePosition: { x: number; y: number } };

export type SoundSetTile = {
  automations: Automation;
  colorIndex: number;
  editorModelState: EditorModelState;
  editorWindowState: Record<string, unknown>;
  favorite: boolean;
  fileName: string;
  fileUUID: string;
  gridPositionX: number;
  gridPositionY: number;
  holdToPlay: boolean;
  lastPlayStart: number;
  listPositionY: number;
  notes: string;
  notesShown: boolean;
  playbackEnabled: boolean;
  playerSettings: PlayerSettings;
  selected: number;
  solo: boolean;
  tileIcon: string[];
  tileUUID: string;
  title: string;
};

export type SoundSet = {
  automations: Automation;
  crossfadeDuration: number;
  formatMinSupportedVersion: number;
  formatVersion: number;
  maxRowsGrid: number;
  maxRowsList: number;
  mode: number;
  notes: string;
  playbackMode: number;
  position: number;
  security: Security;
  setWindowState: WindowState;
  splitViewState: SplitViewState[];
  tiles: SoundSetTile[];
  title: string;
  type: string;
  uuid: string;
};

type Automation = {
  modelItems: unknown[];
};

type Clip = {
  clipUUID: string;
  fileUUID: string;
  name: string;
  originalUUID: string;
  selectedPacketRange: string;
};

type EditorModelState = {
  clip?: Clip;
  zoom?: number;
};

type PlayerSettings = {
  channels: [number, number];
  defaultToPause: boolean;
  ducked: boolean;
  duckedVolume: number;
  duration: number;
  endPackets: number;
  fadeInTime: number;
  fadeOutTime: number;
  fullVolume: number;
  loop: boolean;
  muted: boolean;
  packetCount: number;
  startPackets: number;
};

type SplitViewState = {
  collapsed: boolean;
  size: number;
};

type Security = {
  hint: string;
  locked: boolean;
  password: string;
  passwordRequired: boolean;
};

type WindowState = {
  frame: string;
  fullscreen: boolean;
  open: boolean;
};
