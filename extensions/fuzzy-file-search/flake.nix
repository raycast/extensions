{
  description = "Flake with the development environment for the project";

  inputs = {
    nixpkgs-linux.url = "github:NixOS/nixpkgs/nixos-25.05";
    nixpkgs-darwin.url = "github:NixOS/nixpkgs/nixpkgs-25.05-darwin";
    systems.url = "github:nix-systems/default";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      nixpkgs-linux,
      nixpkgs-darwin,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs =
          import (if builtins.match ".*-darwin" system != null then nixpkgs-darwin else nixpkgs-linux)
            {
              inherit system;
            };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.nixfmt-rfc-style
            pkgs.nodejs_22
          ];
        };
      }
    );
}
