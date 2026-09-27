import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

/**
 * Builds the visitor page into the extension assets the service already serves: the page at `/`, its bundled
 * resources under `/static/*`. The output is plain HTML/CSS/JS — no runtime dependency on React or Vite.
 *
 * `root` and `outDir` are relative, so run this from the extension directory (`npm run build:web`).
 */
export default defineConfig({
  root: "web",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../assets/web",
    emptyOutDir: true,
    assetsDir: "static",
    sourcemap: false,
  },
});
