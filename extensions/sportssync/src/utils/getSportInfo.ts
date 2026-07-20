const sportInfo = {
  currentSport: "",
  currentLeague: "",

  setSportAndLeague(sport: string, league: string) {
    this.currentSport = sport;
    this.currentLeague = league;
  },

  getSport() {
    return this.currentSport;
  },

  getLeague() {
    return this.currentLeague;
  },

  getSportAndLeague() {
    return { sport: this.currentSport, league: this.currentLeague };
  },
};

export default sportInfo;
