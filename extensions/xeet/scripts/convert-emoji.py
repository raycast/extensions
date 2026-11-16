"""Repackage OFL Noto emoji PNGs as sbix for Xeet; do not change artwork.

The derived font is renamed Xeet Preview Emoji. Run with fonttools 4.60.1.
"""
import sys
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables.sbixStrike import Strike
from fontTools.ttLib.tables.sbixGlyph import Glyph

font = TTFont(sys.argv[1], recalcTimestamp=False)
sbix = newTable("sbix")
sbix.version = 1
sbix.flags = 1
sbix.strikes = {}
for index, bitmap_strike in enumerate(font["CBLC"].strikes):
    # Xeet places square Apple strikes at the em-box baseline. Noto's PNGs
    # have transparent padding; use the image height as the strike's ppem so
    # the unchanged image fits that em box without clipping the line.
    data = font["CBDT"].strikeData[index]
    ppem = max(glyph.metrics.height for glyph in data.values())
    strike = Strike(ppem=ppem, resolution=72)
    for name in font.getGlyphOrder():
        if name in data:
            glyph = data[name]
            strike.glyphs[name] = Glyph(glyphName=name, originOffsetX=0, originOffsetY=0,
                                        graphicType="png ", imageData=glyph.imageData)
        else:
            strike.glyphs[name] = Glyph(glyphName=name)
    sbix.strikes[ppem] = strike
font["sbix"] = sbix
del font["CBDT"]
del font["CBLC"]
for name_id, value in [(1, "Xeet Preview Emoji"), (2, "Regular"), (3, "XeetPreviewEmoji-1.0"),
                       (4, "Xeet Preview Emoji"), (6, "XeetPreviewEmoji"), (16, "Xeet Preview Emoji")]:
    font["name"].setName(value, name_id, 3, 1, 0x409)
    font["name"].setName(value, name_id, 1, 0, 0)
font.save(sys.argv[2])
