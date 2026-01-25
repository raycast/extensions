import { getTailwindColors } from "./tailwind-colors";                        
                                                                                
  interface RGB {                                                               
    r: number;                                                                  
    g: number;                                                                  
    b: number;                                                                  
  }                                                                             
                                                                                
  interface ColorMatch {                                                        
    name: string;                                                               
    hex: string;                                                                
    distance: number;                                                           
    rgb: RGB;                                                                   
  }                                                                             
                                                                                
  export function hexToRgb(hex: string): RGB | null {                           
    const cleanHex = hex.replace(/^#/, "");                                     
    let fullHex = cleanHex;                                                     
    if (cleanHex.length === 3) {                                                
      fullHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] +         
  cleanHex[2] + cleanHex[2];                                                    
    }                                                                           
    if (!/^[0-9A-Fa-f]{6}$/.test(fullHex)) {                                    
      return null;                                                              
    }                                                                           
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);     
    return result                                                               
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b:            
  parseInt(result[3], 16) }                                                     
      : null;                                                                   
  }                                                                             
                                                                                
  function colorDistance(color1: RGB, color2: RGB): number {                    
    return Math.sqrt(                                                           
      Math.pow(color1.r - color2.r, 2) +                                        
      Math.pow(color1.g - color2.g, 2) +                                        
      Math.pow(color1.b - color2.b, 2)                                          
    );                                                                          
  }                                                                             
                                                                                
  export function findNearestColors(inputHex: string, count: number = 5,        
  version: "v3" | "v4" = "v4"): ColorMatch[] {                                  
    const inputRgb = hexToRgb(inputHex);                                        
    if (!inputRgb) return [];                                                   
                                                                                
    const colors = getTailwindColors(version);                                  
    const matches: ColorMatch[] = [];                                           
                                                                                
    for (const [name, hex] of Object.entries(colors)) {                         
      const rgb = hexToRgb(hex);                                                
      if (!rgb) continue;                                                       
      const distance = colorDistance(inputRgb, rgb);                            
      matches.push({ name, hex, distance, rgb });                               
    }                                                                           
                                                                                
    return matches.sort((a, b) => a.distance - b.distance).slice(0, count);     
  }                                                                             
                                                                                
  export function isValidHex(hex: string): boolean {                            
    const cleanHex = hex.replace(/^#/, "");                                     
    return /^[0-9A-Fa-f]{3}$/.test(cleanHex) ||                                 
  /^[0-9A-Fa-f]{6}$/.test(cleanHex);                                            
  }                                                                             
                                                                                
  export function distanceToPercentage(distance: number): number {              
    const maxDistance = 441.67;                                                 
    const percentage = Math.round((1 - distance / maxDistance) * 100);          
    return Math.max(0, Math.min(100, percentage));                              
  }
