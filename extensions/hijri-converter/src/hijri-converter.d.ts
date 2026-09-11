declare module "hijri-converter" {
  export function toGregorian(hy: number, hm: number, hd: number): { gy: number; gm: number; gd: number };

  export function toHijri(gy: number, gm: number, gd: number): { hy: number; hm: number; hd: number };
}
