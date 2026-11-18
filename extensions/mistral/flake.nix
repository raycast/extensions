{
  description = "Raycast Extensions Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            typescript-go
            typescript-language-server
            git
          ];

          shellHook = ''
            echo "Raycast development environment loaded!"
            if [ -f package.json ]; then
              echo "Running npm install..."
              npm install
            fi
          '';
        };

        packages.default = pkgs.writeShellApplication {
          name = "build-extensions";
          text = ''
            npm run build
          '';
        };
      }
    );
}
