export interface SystemStat {
  type: string;
  updated: string;
  created: string;
  stats: {
    cpu: number;
    /** Memory */
    m: number;
    /** Memory used */
    mu: number;
    /** Memory in percentage */
    mp: number;
    /** Memory buffed cache */
    mb: number;
    /** Disk total */
    d: number;
    /** Disk used */
    du: number;
    /** Disk in percentage */
    dp: number;
    /** Disk read ps? */
    dr: number;
    /** Disk write ps? */
    dw: number;
    /** Network sent */
    ns: number;
    /** Network received */
    nr: number;
  };
}
