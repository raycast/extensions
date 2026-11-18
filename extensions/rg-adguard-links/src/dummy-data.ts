import { AppMetadata, DownloadLink } from "./types";

export const DUMMY_APP_METADATA: AppMetadata = {
  name: "15647 Neon Band. Explorerfor Files",
  productId: "9n0kwg910ldh",
  version: "1.219.24.0",
  publisher: "15647 Neon Band",
};

export const DUMMY_DOWNLOAD_LINKS: DownloadLink[] = [
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.219.24.0_x64_g3b9h1p9bdemw.appx",
    url: "https://example.com/download/1",
    size: "19.31 MB",
    type: "APPX",
  },
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.219.24.0_x86_g3b9h1p9bdemw.appx",
    url: "https://example.com/download/2",
    size: "16.89 MB",
    type: "APPX",
  },
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.385.96.0_x64_g3b9h1p9bdemw.msix",
    url: "https://example.com/download/5",
    size: "61.34 MB",
    type: "MSIX",
  },
  {
    fileName: "15647NeonBand.ExplorerforFiles_1.400.0.0_x64_g3b9h1p9bdemw.msix",
    url: "https://example.com/download/9",
    size: "92.45 MB",
    type: "MSIX",
  },
];
