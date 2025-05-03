// import { environment } from "@raycast/api";
// export const apiUrl = environment.isDevelopment ? 'http://localhost:8000/api/raycast' : 'https://api.cardpointers.com/api/raycast'

const isDevEnvironment = process.env.NODE_ENV === "development";

export const apiUrl = isDevEnvironment
  ? "http://localhost:8000/api/raycast"
  : "https://api.cardpointers.com/api/raycast";
