export interface Signature {
  id: string;
  name: string;
  type: "text" | "drawn" | "image";
  content?: string;
  font?: string;
  imagePath?: string;
  drawingData?: string;
  createdAt: string;
}
