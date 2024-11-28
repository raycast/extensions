{
  description = "Nodejs Dev Flake";

  inputs = {
    stable.url = "github:nixos/nixpkgs/release-22.11";
    flake-utils.url = "github:numtide/flake-utils";
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };

    pre-commit-hooks = {
      url = "github:cachix/pre-commit-hooks.nix";
      inputs = {
        nixpkgs.follows = "stable";
        flake-utils.follows = "flake-utils";
        flake-compat.follows = "flake-compat";
      };
    };
  };

  outputs = { self, flake-utils, ... }:
    flake-utils.lib.eachSystem [
      "aarch64-linux"
      "aarch64-darwin"
      "x86_64-darwin"
      "x86_64-linux"
    ] (system:
      let
        pkgs = self.inputs.stable.legacyPackages.${system};

        checks = {
          pre-commit = self.inputs.pre-commit-hooks.lib.${system}.run {
            src = self;
            hooks = {
              eslint.enable = true;
              nixfmt.enable = true;
              statix.enable = true;

              prettier-write = {
                # Temporarily disable
                enable = false;
                name = "Prettier Write";
                entry = "${pkgs.nodePackages.prettier}/bin/prettier --write .";
                files = "\\.(js|ts|jsx|tsx|json|yml|yaml)$";
                language = "system";
              };

              statix-write = {
                enable = true;
                name = "Statix Write";
                entry = "${pkgs.statix}/bin/statix fix";
                language = "system";
                pass_filenames = false;
              };
            };
          };
        };

        devShells = let
          name = "dev-shell";

          base = with pkgs; [ nixfmt nodejs-18_x statix ];
          node = with pkgs.nodePackages; [ typescript prettier eslint ];

          packages = base ++ node;
        in {
          "${name}" = pkgs.mkShell {
            inherit name packages;
          };
          default = self.outputs.devShells.${system}.${name};
        };

        formatter = pkgs.nixfmt;
      in { inherit devShells checks formatter; });
}
