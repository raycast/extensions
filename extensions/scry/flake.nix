{
  description = "scry-raycast";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAll = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      formatter = forAll (pkgs: pkgs.nixfmt);

      devShells = forAll (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_24
            just
            lefthook
            nixfmt
          ];
        };
      });
    };
}
