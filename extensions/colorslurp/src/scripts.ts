import { runAppleScriptJs } from "./utilities";

export interface RecentColor {
  name: string;
  hex: string;
}

export function getRecentColors(): Promise<RecentColor[]> {
  return (
    runAppleScriptJs(`
        var app = Application("ColorSlurp");
        var array = [];
        const colors = app.recentcolors();
        const count = app.recentcolors().length;

        for (var i = 0; i < count; i++) {
            const color = app.recentcolors[i];
            array.push({
            name: color.name(),
            hex: color.hex(),
            });
        }

        return array;
    `) ?? []
  );
}

export function getIsPro(): Promise<boolean> {
  return (
    runAppleScriptJs(`
        var app = Application("ColorSlurp");
        return app.ispro();
    `) ?? false
  );
}

export interface ColorFormat {
  id: string;
  name: string;
}

export function getColorFormats(): Promise<ColorFormat[]> {
  return (
    runAppleScriptJs(`
        var app = Application("ColorSlurp");
        var array = [];
        const count = app.colorformats().length;

        for (var i = 0; i < count; i++) {
            const format = app.colorformats[i];
            array.push({
                id: format.id(),
                name: format.name(),
            });
        }

        return array;
    `) ?? []
  );
}

export interface ColorFormatWithFormattedColor {
  id: string;
  name: string;
  formattedColor: string;
}

export function getColorFormatsWithConvertedColor(colorString: string): Promise<ColorFormatWithFormattedColor[]> {
  colorString = makeColorScriptSafe(colorString);

  return (
    runAppleScriptJs(`
        var app = Application("ColorSlurp");
        var array = [];
        const count = app.colorformats().length;

        for (var i = 0; i < count; i++) {
            const format = app.colorformats[i];
            array.push({
                id: format.id(),
                name: format.name(),
                formattedColor: format.format({ color: "${colorString}" }),
            });
        }

        return array;
    `) ?? []
  );
}

export function convertColor(colorString: string, formatId: string): Promise<string | null> {
  colorString = makeColorScriptSafe(colorString);

  return (
    runAppleScriptJs(`
        var app = Application("ColorSlurp");

        const count = app.colorformats().length;

        for (var i = 0; i < count; i++) {
            const format = app.colorformats[i];
            
            if (format.id() == "${formatId}") {
                return format.format({ color: "${colorString}" });
            }
        }

        return null;
    `) ?? []
  );
}

function makeColorScriptSafe(color: string): string {
  return color.replace(/"/g, '\\"');
}
