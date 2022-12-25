export type Category = {
  id: string; 
  title: string;
  icons: string[];
};

export type Preferences = {
  action: "Copy" | "Paste";
}