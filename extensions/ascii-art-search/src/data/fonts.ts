/**
 * Figlet font definitions - Popular fonts subset for performance
 * Full font list available but loaded on-demand
 */

// Popular/Featured fonts - loaded immediately
import standard from "figlet/fonts/Standard";
import big from "figlet/fonts/Big";
import slant from "figlet/fonts/Slant";
import small from "figlet/fonts/Small";
import banner from "figlet/fonts/Banner";
import block from "figlet/fonts/Block";
import bubble from "figlet/fonts/Bubble";
import digital from "figlet/fonts/Digital";
import doom from "figlet/fonts/Doom";
import gothic from "figlet/fonts/Gothic";
import graffiti from "figlet/fonts/Graffiti";
import ivrit from "figlet/fonts/Ivrit";
import lean from "figlet/fonts/Lean";
import mini from "figlet/fonts/Mini";
import script from "figlet/fonts/Script";
import shadow from "figlet/fonts/Shadow";
import speed from "figlet/fonts/Speed";
// Additional popular fonts
import _3d from "figlet/fonts/3-D";
import ansiShadow from "figlet/fonts/ANSI Shadow";
import banner3 from "figlet/fonts/Banner3";
import bloody from "figlet/fonts/Bloody";
import broadway from "figlet/fonts/Broadway";
import colossal from "figlet/fonts/Colossal";
import crawford from "figlet/fonts/Crawford";
import epic from "figlet/fonts/Epic";
import fraktur from "figlet/fonts/Fraktur";
import ghost from "figlet/fonts/Ghost";
import isometric1 from "figlet/fonts/Isometric1";
import larry3d from "figlet/fonts/Larry 3D";
import ogre from "figlet/fonts/Ogre";
import poison from "figlet/fonts/Poison";
import roman from "figlet/fonts/Roman";
import starWars from "figlet/fonts/Star Wars";
import thick from "figlet/fonts/Thick";
import alligator from "figlet/fonts/Alligator";
import avatar from "figlet/fonts/Avatar";
import basic from "figlet/fonts/Basic";
import bell from "figlet/fonts/Bell";
import bigChief from "figlet/fonts/Big Chief";
import calvinS from "figlet/fonts/Calvin S";
import chunky from "figlet/fonts/Chunky";
import contessa from "figlet/fonts/Contessa";
import cyberlarge from "figlet/fonts/Cyberlarge";
import dosRebel from "figlet/fonts/DOS Rebel";
import dancingFont from "figlet/fonts/Dancing Font";
import electronic from "figlet/fonts/Electronic";
import fuzzy from "figlet/fonts/Fuzzy";
import graceful from "figlet/fonts/Graceful";
import impossible from "figlet/fonts/Impossible";
import keyboard from "figlet/fonts/Keyboard";
import modular from "figlet/fonts/Modular";
import nancyj from "figlet/fonts/Nancyj";
import ogre2 from "figlet/fonts/O8";
import rectangles from "figlet/fonts/Rectangles";
import relief from "figlet/fonts/Relief";
import rounded from "figlet/fonts/Rounded";
import smSlant from "figlet/fonts/Small Slant";
import soft from "figlet/fonts/Soft";
import stampate from "figlet/fonts/Stampate";
import stellar from "figlet/fonts/Stellar";
import stop from "figlet/fonts/Stop";
import straight from "figlet/fonts/Straight";
import subZero from "figlet/fonts/Sub-Zero";
import trek from "figlet/fonts/Trek";
import univers from "figlet/fonts/Univers";
import usaFlag from "figlet/fonts/USA Flag";
import weird from "figlet/fonts/Weird";

export interface FontDefinition {
  name: string;
  data: string;
}

export const FONTS: readonly FontDefinition[] = [
  // Core fonts
  { name: "Standard", data: standard },
  { name: "Big", data: big },
  { name: "Slant", data: slant },
  { name: "Small", data: small },
  { name: "Banner", data: banner },
  { name: "Block", data: block },
  { name: "Bubble", data: bubble },
  { name: "Digital", data: digital },
  { name: "Doom", data: doom },
  { name: "Gothic", data: gothic },
  { name: "Graffiti", data: graffiti },
  { name: "Ivrit", data: ivrit },
  { name: "Lean", data: lean },
  { name: "Mini", data: mini },
  { name: "Script", data: script },
  { name: "Shadow", data: shadow },
  { name: "Speed", data: speed },
  // Featured fonts
  { name: "3-D", data: _3d },
  { name: "ANSI Shadow", data: ansiShadow },
  { name: "Banner3", data: banner3 },
  { name: "Bloody", data: bloody },
  { name: "Broadway", data: broadway },
  { name: "Colossal", data: colossal },
  { name: "Crawford", data: crawford },
  { name: "Epic", data: epic },
  { name: "Fraktur", data: fraktur },
  { name: "Ghost", data: ghost },
  { name: "Isometric1", data: isometric1 },
  { name: "Larry 3D", data: larry3d },
  { name: "Ogre", data: ogre },
  { name: "Poison", data: poison },
  { name: "Roman", data: roman },
  { name: "Star Wars", data: starWars },
  { name: "Thick", data: thick },
  // Popular fonts
  { name: "Alligator", data: alligator },
  { name: "Avatar", data: avatar },
  { name: "Basic", data: basic },
  { name: "Bell", data: bell },
  { name: "Big Chief", data: bigChief },
  { name: "Calvin S", data: calvinS },
  { name: "Chunky", data: chunky },
  { name: "Contessa", data: contessa },
  { name: "Cyberlarge", data: cyberlarge },
  { name: "Dancing Font", data: dancingFont },
  { name: "DOS Rebel", data: dosRebel },
  { name: "Electronic", data: electronic },
  { name: "Fuzzy", data: fuzzy },
  { name: "Graceful", data: graceful },
  { name: "Impossible", data: impossible },
  { name: "Keyboard", data: keyboard },
  { name: "Modular", data: modular },
  { name: "Nancyj", data: nancyj },
  { name: "O8", data: ogre2 },
  { name: "Rectangles", data: rectangles },
  { name: "Relief", data: relief },
  { name: "Rounded", data: rounded },
  { name: "Small Slant", data: smSlant },
  { name: "Soft", data: soft },
  { name: "Stampate", data: stampate },
  { name: "Stellar", data: stellar },
  { name: "Stop", data: stop },
  { name: "Straight", data: straight },
  { name: "Sub-Zero", data: subZero },
  { name: "Trek", data: trek },
  { name: "Univers", data: univers },
  { name: "USA Flag", data: usaFlag },
  { name: "Weird", data: weird },
] as const;
