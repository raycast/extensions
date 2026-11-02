export type Radio = {
  id: string;
  title: string;
  streamUrl: string;
  pageUrl: string;
};

const radio = (id: string, title: string, stream: string, page: string): Radio => ({
  id,
  title,
  streamUrl: `https://stream.radiofrance.fr/${stream}/${stream}_hifi.m3u8`,
  pageUrl: `https://www.radiofrance.fr/${page}`,
});

export const FIP = radio("7", "FIP", "fip", "fip");

export const RADIOS: Radio[] = [
  FIP,
  radio("95", "Hip-Hop", "fiphiphop", "fip/radio-hip-hop"),
  radio("64", "Rock", "fiprock", "fip/radio-rock"),
  radio("65", "Jazz", "fipjazz", "fip/radio-jazz"),
  radio("66", "Groove", "fipgroove", "fip/radio-groove"),
  radio("74", "Electro", "fipelectro", "fip/radio-electro"),
  radio("71", "Reggae", "fipreggae", "fip/radio-reggae"),
  radio("96", "Sacré français !", "fipsacrefrancais", "fip/radio-sacre-francais"),
  radio("78", "Pop", "fippop", "fip/radio-pop"),
  radio("69", "Monde", "fipworld", "fip/radio-monde"),
  radio("70", "Nouveautés", "fipnouveautes", "fip/radio-nouveautes"),
  radio("77", "Metal", "fipmetal", "fip/radio-metal"),
  radio("709", "Cultes", "fipcultes", "fip/radio-cultes"),
];

export const radioByTitle = (title: string): Radio => RADIOS.find((radio) => radio.title === title) ?? FIP;

export const radioById = (id: string | undefined): Radio => RADIOS.find((radio) => radio.id === id) ?? FIP;
