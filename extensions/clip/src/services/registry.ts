import { ShorteningService } from "../types";

export const services: ShorteningService[] = [
  {
    id: "bitly",
    name: "bit.ly",
    endpoint: "https://api-ssl.bitly.com/v4/shorten",
    icon: "bit.ly.png",
    requiresApiKey: true,
    apiKeyPreferenceName: "bitlyApiKey",
  },
  {
    id: "cuttly",
    name: "cutt.ly",
    endpoint: "https://cutt.ly/api/api.php",
    icon: "cutt.ly.png",
    requiresApiKey: true,
    apiKeyPreferenceName: "cuttlyApiKey",
  },
  {
    id: "tinyurl",
    name: "tinyurl",
    endpoint: "https://tinyurl.com/api-create.php",
    icon: "tinyurl.com.png",
    requiresApiKey: false,
  },
  {
    id: "isgd",
    name: "is.gd",
    endpoint: "https://is.gd/create.php",
    icon: "is.gd.png",
    requiresApiKey: false,
  },
  {
    id: "vgd",
    name: "v.gd",
    endpoint: "https://v.gd/create.php",
    icon: "v.gd.png",
    requiresApiKey: false,
  },
];
