import { useCallback, useEffect, useState } from "react";
import * as d3 from "d3-color";
import { hsl, rgb } from "d3-color";
import { opacityToHex } from "../utils/color-converter-utils";

export const getColorSpaces = (searchContent: string) => {
  const [colorSpaces, setColorSpaces] = useState<[string, string][]>([]);
  const [contrastColors, setContrastColors] = useState<string>("");
  const [similarColors, setSimilarColors] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    //convert searchContent to rgb, hex, hsl
    const _colorString = searchContent.trim();
    const _color = d3.color(_colorString);
    let allColorSpaces = { rgb: "rgb(0, 0, 0)", hex: "#000000", hsl: "hsl(0, 0%, 0%)" };
    if (_color instanceof rgb) {
      if (isNaN(_color.r)) return;
      allColorSpaces = { rgb: _color.formatRgb(), hex: _color.formatHex(), hsl: _color.formatHsl() };
    } else if (_color instanceof hsl) {
      allColorSpaces = { rgb: _color.formatRgb(), hex: _color.formatHex(), hsl: _color.formatHsl() };
    }

    setColorSpaces(Object.entries(allColorSpaces));

    //get Contrast colors
    const currentRgb = d3.rgb(_color?.formatRgb() + "");

    if (currentRgb instanceof rgb) {
      if (!isNaN(currentRgb.r)) {
        setContrastColors(`rgb(${255 - currentRgb.r}, ${255 - currentRgb.g}, ${255 - currentRgb.b})`);
      }
    }

    //get similar colors
    let k = 0;
    const brighterColors: string[] = [];
    const darkerColors: string[] = [];
    while (k < 1) {
      const _bc = _color?.brighter(k).formatRgb();
      const _dc = _color?.darker(k).formatRgb();
      typeof _bc !== "undefined" && brighterColors.push(_bc);
      typeof _dc !== "undefined" && darkerColors.push(_dc);
      k += 0.2;
    }
    const _brighterColors = brighterColors.reverse();
    _brighterColors.pop();
    darkerColors.pop();
    setSimilarColors([..._brighterColors, ...darkerColors]);

    setLoading(false);
  }, [searchContent]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    colorSpaces: colorSpaces,
    contrastColors: contrastColors,
    similarColors: similarColors,
    loading: loading,
  };
};

export const getOpacity = () => {
  const [opacity, setOpacity] = useState<{ opacity: string; hex: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    let k = 0;
    const _opacity: { opacity: string; hex: string }[] = [];
    while (k < 1.01) {
      const _hex = opacityToHex(k);
      _opacity.push({ opacity: `${(k * 100).toFixed()}%`, hex: _hex });
      k += 0.01;
    }
    setOpacity(_opacity);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { opacity: opacity, loading: loading };
};
