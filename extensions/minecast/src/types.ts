export interface Server {
  id: string;
  name: string;
  ip: string;
  port: number;
  type: "java" | "bedrock";
  createdAt: number;
}
