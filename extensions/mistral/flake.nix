{
  description = "Mistral Raycast Extension Development Environment with Bun";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }: flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          bun
          # Add other tools if needed, e.g., typescript, prettier from nixpkgs
          nodePackages.typescript
          nodePackages.prettier
          git
          # Raycast CLI: Install via npm in shellHook or assume global; Bun can handle scripts
        ];

        shellHook = ''
          echo "Bun development environment for Mistral Raycast Extension loaded!"
          # Install dependencies with Bun if package.json exists
          if [ -f package.json ]; then
            echo "Running bun install..."
            bun install
          fi
          # If ray CLI not global, install it via Bun (requires npm compat)
          if ! command -v ray &> /dev/null; then
            echo "Installing Raycast CLI via Bun..."
            bun add -g @raycast/api
          fi
          # Alias for Raycast commands using Bun
          alias ray-build='bun run build'
          alias ray-dev='bun run dev'
          alias ray-lint='bun run lint'
        '';
      };

      # Optional: Packages output for building the extension
      packages.default = pkgs.writeShellApplication {
        name = "build-mistral-extension";
        text = ''
          bun run build  # Uses the build script from package.json
        '';
      };
    }
  );
}
