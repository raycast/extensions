from pathlib import Path

from rdkit import Chem
from rdkit.Chem import AllChem
from rdkit.Chem.Draw import rdMolDraw2D


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "assets" / "amino-acids"
COMPACT_OUTPUT_DIR = ROOT / "assets" / "amino-acids-compact"
WIDTH = 360
HEIGHT = 220

CANONICAL_AMINO_ACIDS = [
    ("alanine", "[NH3+][C@@H](C)C(=O)[O-]"),
    ("arginine", "[NH3+][C@@H](CCCNC(=[NH2+])N)C(=O)[O-]"),
    ("asparagine", "[NH3+][C@@H](CC(=O)N)C(=O)[O-]"),
    ("aspartic-acid", "[NH3+][C@@H](CC(=O)[O-])C(=O)[O-]"),
    ("cysteine", "[NH3+][C@@H](CS)C(=O)[O-]"),
    ("glutamic-acid", "[NH3+][C@@H](CCC(=O)[O-])C(=O)[O-]"),
    ("glutamine", "[NH3+][C@@H](CCC(=O)N)C(=O)[O-]"),
    ("glycine", "[NH3+]CC(=O)[O-]"),
    ("histidine", "[NH3+][C@@H](Cc1c[nH]cn1)C(=O)[O-]"),
    ("isoleucine", "[NH3+][C@@H]([C@H](C)CC)C(=O)[O-]"),
    ("leucine", "[NH3+][C@@H](CC(C)C)C(=O)[O-]"),
    ("lysine", "[NH3+][C@@H](CCCC[NH3+])C(=O)[O-]"),
    ("methionine", "[NH3+][C@@H](CCSC)C(=O)[O-]"),
    ("phenylalanine", "[NH3+][C@@H](Cc1ccccc1)C(=O)[O-]"),
    ("proline", "[NH2+]1CCC[C@H]1C(=O)[O-]"),
    ("serine", "[NH3+][C@@H](CO)C(=O)[O-]"),
    ("threonine", "[NH3+][C@@H]([C@H](O)C)C(=O)[O-]"),
    ("tryptophan", "[NH3+][C@@H](Cc1c[nH]c2ccccc12)C(=O)[O-]"),
    ("tyrosine", "[NH3+][C@@H](Cc1ccc(O)cc1)C(=O)[O-]"),
    ("valine", "[NH3+][C@@H](C(C)C)C(=O)[O-]"),
]


def draw_svg(smiles: str) -> str:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Could not parse SMILES: {smiles}")

    AllChem.Compute2DCoords(mol)
    drawer = rdMolDraw2D.MolDraw2DSVG(WIDTH, HEIGHT)
    options = drawer.drawOptions()
    options.addStereoAnnotation = True
    options.bondLineWidth = 1.8
    options.fixedFontSize = 13
    options.padding = 0.22
    options.clearBackground = True
    options.backgroundColour = (1, 1, 1, 1)

    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    svg = drawer.GetDrawingText().replace("svg:", "")
    svg = svg.replace(
        "<svg version='1.1' baseProfile='full'",
        "<svg version='1.1' baseProfile='full'\n     style='background-color:#FFFFFF'",
        1,
    )
    svg = svg.replace(
        "<!-- END OF HEADER -->",
        (
            "<!-- END OF HEADER -->\n"
            f"<rect x='0' y='0' width='{WIDTH}' height='{HEIGHT}' "
            "style='fill:#FFFFFF;fill-opacity:1;stroke:none'/>"
        ),
        1,
    )

    return svg


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    COMPACT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for slug, smiles in CANONICAL_AMINO_ACIDS:
        svg = draw_svg(smiles)
        (OUTPUT_DIR / f"{slug}.svg").write_text(svg, encoding="utf-8")
        (COMPACT_OUTPUT_DIR / f"{slug}-compact.svg").write_text(svg, encoding="utf-8")

    print(f"Generated {len(CANONICAL_AMINO_ACIDS)} SVGs in {OUTPUT_DIR}")
    print(f"Generated {len(CANONICAL_AMINO_ACIDS)} compact SVGs in {COMPACT_OUTPUT_DIR}")


if __name__ == "__main__":
    main()
