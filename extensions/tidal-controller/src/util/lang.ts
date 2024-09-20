export type LanguageCode =
  | "Bulgarian"
  | "Danish"
  | "German"
  | "English"
  | "Spanish"
  | "French"
  | "Croatian"
  | "Italian"
  | "Norwegian"
  | "Polish"
  | "PortugueseBrazil"
  | "Portuguese"
  | "Slovenian"
  | "Serbian"
  | "Swedish"
  | "Turkish";

export type MenuOptions = {
  playback: string;
  shuffle: string;
  next: string;
  previous: string;
  play: string;
  pause: string;
  playNext: string;
  playPrevious: string;
  playRepeat: string;
  playRepeatOne: string;
  volUp: string;
  volDown: string;
};

export const getMenuOptionsByLanguage = (code: LanguageCode): MenuOptions => {
  switch (code) {
    case "Bulgarian":
      return {
        playback: "Възпроизвеждане",
        shuffle: "Разбъркай",
        next: "Следващ/а",
        previous: "Предишен/а",
        play: "Пусни",
        pause: "Пауза",
        playNext: "Пусни следващата песен",
        playPrevious: "Пусни предишната песен",
        playRepeat: "Повторение",
        playRepeatOne: "Повтаряй една песен",
        volUp: "Увеличаване на силата на звука",
        volDown: "Намаляване на силата на звука",
      };
    case "Danish":
      return {
        playback: "Afspiller",
        shuffle: "Shuffle",
        next: "Næste",
        previous: "Forrige",
        play: "Play",
        pause: "Pause",
        playNext: "Spil næste sang",
        playPrevious: "Spil forrige sang",
        playRepeat: "Gentag",
        playRepeatOne: "Gentag en sang",
        volUp: "Lydstyrke op",
        volDown: "Lydstyrke ned",
      };
    case "German":
      return {
        playback: "Wiedergabe",
        shuffle: "Shuffle",
        next: "Weiter",
        previous: "Zurück",
        play: "Abspielen",
        pause: "Pause",
        playNext: "Nächsten Titel abspielen",
        playPrevious: "Vorherigen Titel abspielen",
        playRepeat: "Wiederholen",
        playRepeatOne: "Einen Titel wiederholen",
        volUp: "Lauter",
        volDown: "Leiser",
      };
    case "English":
      return {
        playback: "Playback",
        shuffle: "Shuffle",
        next: "Next",
        previous: "Previous",
        play: "Play",
        pause: "Pause",
        playNext: "Play Next Track",
        playPrevious: "Play Previous Track",
        playRepeat: "Repeat",
        playRepeatOne: "Repeat One",
        volUp: "Volume up",
        volDown: "Volume down",
      };
    case "Spanish":
      return {
        playback: "Reproducción",
        shuffle: "Aleatorio",
        next: "Siguiente",
        previous: "Anterior",
        play: "Reproducir",
        pause: "Pausa",
        playNext: "Reproducir siguiente pista",
        playPrevious: "Reproducir pista anterior",
        playRepeat: "Repetir",
        playRepeatOne: "Repetir una",
        volUp: "Subir el volumen",
        volDown: "Bajar el volumen",
      };
    case "French":
      return {
        playback: "Lecture",
        shuffle: "Aléatoire",
        next: "Suivant",
        previous: "Précédent",
        play: "Jouer",
        pause: "Pause",
        playNext: "Lire le morceau suivant",
        playPrevious: "Lire le morceau précédent",
        playRepeat: "Répéter",
        playRepeatOne: "Répéter un morceau",
        volUp: "Augmenter le volume",
        volDown: "Diminuer le volume",
      };
    case "Croatian":
      return {
        playback: "Reprodukcija",
        shuffle: "Nasumično",
        next: "Dalje",
        previous: "Prethodno",
        play: "Reproduciraj",
        pause: "Pauza",
        playNext: "Reproduciraj sljedeću pjesmu",
        playPrevious: "Reproduciraj prethodnu pjesmu",
        playRepeat: "Ponovi",
        playRepeatOne: "Ponovi jednu pjesmu",
        volUp: "Veća glasnoća",
        volDown: "Manja glasnoća",
      };
    case "Italian":
      return {
        playback: "Riproduzione",
        shuffle: "Shuffle",
        next: "Successivo",
        previous: "Precedente",
        play: "Play",
        pause: "Pausa",
        playNext: "Riproduci brano successivo",
        playPrevious: "Riproduci brano precedente",
        playRepeat: "Ripeti",
        playRepeatOne: "Ripeti un brano",
        volUp: "Alza volume",
        volDown: "Abbassa volume",
      };
    case "Norwegian":
      return {
        playback: "Avspilling",
        shuffle: "Shuffle",
        next: "Neste",
        previous: "Forrige",
        play: "Spill av",
        pause: "Pause",
        playNext: "Spill neste spor",
        playPrevious: "Spill forrige spor",
        playRepeat: "Repeter",
        playRepeatOne: "Gjenta én",
        volUp: "Lydstyrke opp",
        volDown: "Lydstyrke ned",
      };
    case "Polish":
      return {
        playback: "Odtwarzanie",
        shuffle: "Losowo",
        next: "Następny",
        previous: "Poprzedni",
        play: "Odtwórz",
        pause: "Pauza",
        playNext: "Odtwórz następny utwór",
        playPrevious: "Odtwórz poprzedni utwór",
        playRepeat: "Powtarzaj",
        playRepeatOne: "Powtórz jeden",
        volUp: "Głośniej",
        volDown: "Ciszej",
      };
    case "PortugueseBrazil":
      return {
        playback: "Reprodução",
        shuffle: "Aleatório",
        next: "Próximo",
        previous: "Voltar",
        play: "Tocar",
        pause: "Pausa",
        playNext: "Reproduzir próxima faixa",
        playPrevious: "Reproduzir faixa anterior",
        playRepeat: "Repetir",
        playRepeatOne: "Repetir uma",
        volUp: "Aumentar Volume",
        volDown: "Diminuir Volume",
      };
    case "Portuguese":
      return {
        playback: "Reprodução",
        shuffle: "Aleatório",
        next: "Próximo",
        previous: "Anterior",
        play: "Tocar",
        pause: "Pausa",
        playNext: "Reproduzir faixa seguinte",
        playPrevious: "Reproduzir faixa anterior",
        playRepeat: "Repetir",
        playRepeatOne: "Repetir uma",
        volUp: "Aumentar volume",
        volDown: "Diminuir volume",
      };
    case "Slovenian":
      return {
        playback: "Predvajanje",
        shuffle: "Naključno prerazporedi",
        next: "Naslednje",
        previous: "Prejšnje",
        play: "Predvajaj",
        pause: "Premor",
        playNext: "Predvajaj naslednjo skladbo",
        playPrevious: "Predvajaj prejšnjo skladbo",
        playRepeat: "Ponovi",
        playRepeatOne: "Ponovi eno",
        volUp: "Povišaj glasnost",
        volDown: "Znižaj glasnost",
      };
    case "Serbian":
      return {
        playback: "Reprodukcija",
        shuffle: "Nasumično",
        next: "Sledeće",
        previous: "Prethodno",
        play: "Reprodukuj",
        pause: "Pauziraj",
        playNext: "Pusti sledeću pesmu",
        playPrevious: "Pusti prethodnu pesmu",
        playRepeat: "Ponovi",
        playRepeatOne: "Ponovi jednu",
        volUp: "Povećaj jačinu zvuka",
        volDown: "Smanji jačinu zvuka",
      };
    case "Swedish":
      return {
        playback: "Uppspelning",
        shuffle: "Blanda",
        next: "Nästa",
        previous: "Föregående",
        play: "Spela",
        pause: "Pausa",
        playNext: "Spela nästa spår",
        playPrevious: "Spela föregående spår",
        playRepeat: "Repetera",
        playRepeatOne: "Upprepa en",
        volUp: "Öka volymen",
        volDown: "Sänk volymen",
      };
    case "Turkish":
      return {
        playback: "Oynatma",
        shuffle: "Karıştır",
        next: "İleri",
        previous: "Önceki",
        play: "Yürüt",
        pause: "Duraklat",
        playNext: "Sonraki parçayı çal",
        playPrevious: "Önceki parçayı çal",
        playRepeat: "Tekrarla",
        playRepeatOne: "Bir kez tekrarla",
        volUp: "Sesi aç",
        volDown: "Sesi kıs",
      };
    default:
      return {
        playback: "Playback",
        shuffle: "Shuffle",
        next: "Next",
        previous: "Previous",
        play: "Play",
        pause: "Pause",
        playNext: "Play Next Track",
        playPrevious: "Play Previous Track",
        playRepeat: "Repeat",
        playRepeatOne: "Repeat One",
        volUp: "Volume up",
        volDown: "Volume down",
      };
  }
};
