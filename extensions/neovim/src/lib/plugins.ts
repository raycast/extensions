import fs from "fs";
import path from "path";
import os from "os";
import { usePromise } from "@raycast/utils";
import { PluginEntry } from "./types";

const XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
const LAZY_LOCK_PATH = path.join(XDG_CONFIG_HOME, "nvim/lazy-lock.json");

interface LazyLockEntry {
  branch: string;
  commit: string;
}

function guessGitHubUrl(pluginName: string): string | undefined {
  // Known publishers. When the repository is unknown, omit the link instead
  // of guessing (a wrong repo is worse than no link).
  const publisherMap: Record<string, string> = {
    "nvim-treesitter": "nvim-treesitter",
    "nvim-lspconfig": "neovim",
    "telescope.nvim": "nvim-telescope",
    "gitsigns.nvim": "lewis6991",
    "lualine.nvim": "nvim-lualine",
    "bufferline.nvim": "akinsho",
    "mason.nvim": "williamboman",
    "mason-lspconfig.nvim": "williamboman",
    catppuccin: "catppuccin",
    "copilot.lua": "zbirenbaum",
    "blink.cmp": "saghen",
    rustaceanvim: "mrcjkb",
    "render-markdown.nvim": "MeanderingProgrammer",
    "nvim-colorizer.lua": "norcalli",
    "plenary.nvim": "nvim-lua",
    "nui.nvim": "MunifTanjim",
    "mini.nvim": "echasnovski",
    "mini.ai": "echasnovski",
    "mini.icons": "echasnovski",
    "mini.pairs": "echasnovski",
    "nvim-nio": "nvim-neotest",
    "nvim-dap": "mfussenegger",
    "nvim-dap-ui": "rcarriga",
    "nvim-dap-virtual-text": "theHamsta",
    "nvim-dap-python": "mfussenegger",
    "nvim-treesitter-textobjects": "nvim-treesitter",
    "nvim-ts-autotag": "windwp",
    "friendly-snippets": "rafamadriz",
    LuaSnip: "L3MON4D3",
    "blink-copilot": "saghen",
    "blink.compat": "saghen",
    "cellular-automaton.nvim": "eandrju",
    "smear-cursor.nvim": "sphamba",
    "gruvbox.nvim": "ellisonleao",
    "tokyonight.nvim": "folke",
    "SchemaStore.nvim": "b0o",
    "which-key.nvim": "folke",
    "dashboard-nvim": "glepnir",
    "indent-blankline.nvim": "lukas-reineke",
    "nvim-web-devicons": "nvim-tree",
    "yazi.nvim": "mikavilpas",
    "lazygit.nvim": "folke",
    "octo.nvim": "pwntester",
    "CopilotChat.nvim": "CopilotC-Nvim",
    "supermaven-nvim": "supermaven",
    "tabout.nvim": "abecodes",
    "vim-tmux-nvim": "christoomey",
    "venv-selector.nvim": "linux-cultist",
    "bidi.nvim": "kwkfb",
    "manim.nvim": "loctv",
    "omnisharp-extended-lsp.nvim": "Hoffs",
    "opencode.nvim": "opencode",
    "ts-comments.nvim": "folke",
  };

  const publisher = publisherMap[pluginName];
  return publisher ? `https://github.com/${publisher}/${pluginName}` : undefined;
}

export function usePlugins() {
  const { data, isLoading, error } = usePromise(async () => {
    if (!fs.existsSync(LAZY_LOCK_PATH)) {
      return [];
    }

    const content = fs.readFileSync(LAZY_LOCK_PATH, "utf-8");
    const lockData: Record<string, LazyLockEntry> = JSON.parse(content);

    return Object.entries(lockData)
      .map<PluginEntry>(([name, info]) => ({
        name,
        branch: info.branch,
        commit: info.commit,
        githubUrl: guessGitHubUrl(name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  return { plugins: data || [], isLoading, error };
}
