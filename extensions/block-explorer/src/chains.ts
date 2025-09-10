export interface ChainConfig {
  name: string;
  logo: string;
  explorer_host: string;
}

export const chains: Record<string, ChainConfig> = {
  eth: {
    name: "Ethereum",
    logo: "https://static.debank.com/image/chain/logo_url/eth/42ba589cd077e7bdd97db6480b0ff61d.png",
    explorer_host: "https://etherscan.io",
  },
  bsc: {
    name: "BNB Chain",
    logo: "https://static.debank.com/image/chain/logo_url/bsc/bc73fa84b7fc5337905e527dadcbc854.png",
    explorer_host: "https://bscscan.com",
  },
  xdai: {
    name: "Gnosis Chain",
    logo: "https://static.debank.com/image/chain/logo_url/xdai/43c1e09e93e68c9f0f3b132976394529.png",
    explorer_host: "https://gnosisscan.io",
  },
  matic: {
    name: "Polygon",
    logo: "https://static.debank.com/image/chain/logo_url/matic/52ca152c08831e4765506c9bd75767e8.png",
    explorer_host: "https://polygonscan.com",
  },
  ftm: {
    name: "Fantom",
    logo: "https://static.debank.com/image/chain/logo_url/ftm/14133435f89637157a4405e954e1b1b2.png",
    explorer_host: "https://explorer.fantom.network",
  },
  avax: {
    name: "Avalanche",
    logo: "https://static.debank.com/image/chain/logo_url/avax/4d1649e8a0c7dec9de3491b81807d402.png",
    explorer_host: "https://snowscan.xyz",
  },
  op: {
    name: "OP",
    logo: "https://static.debank.com/image/chain/logo_url/op/68bef0c9f75488f4e302805ef9c8fc84.png",
    explorer_host: "https://optimistic.etherscan.io",
  },
  arb: {
    name: "Arbitrum",
    logo: "https://static.debank.com/image/chain/logo_url/arb/854f629937ce94bebeb2cd38fb336de7.png",
    explorer_host: "https://arbiscan.io",
  },
  celo: {
    name: "Celo",
    logo: "https://static.debank.com/image/chain/logo_url/celo/faae2c36714d55db1d7a36aba5868f6a.png",
    explorer_host: "https://celoscan.io",
  },
  movr: {
    name: "Moonriver",
    logo: "https://static.debank.com/image/chain/logo_url/movr/cfdc1aef482e322abd02137b0e484dba.png",
    explorer_host: "https://moonriver.moonscan.io",
  },
  cro: {
    name: "Cronos",
    logo: "https://static.debank.com/image/chain/logo_url/cro/f947000cc879ee8ffa032793808c741c.png",
    explorer_host: "https://cronoscan.com",
  },
  boba: {
    name: "Boba",
    logo: "https://static.debank.com/image/chain/logo_url/boba/e43d79cd8088ceb3ea3e4a240a75728f.png",
    explorer_host: "https://bobascan.com",
  },
  metis: {
    name: "Metis",
    logo: "https://static.debank.com/image/chain/logo_url/metis/7485c0a61c1e05fdf707113b6b6ac917.png",
    explorer_host: "https://explorer.metis.io",
  },
  mobm: {
    name: "Moonbeam",
    logo: "https://static.debank.com/image/chain/logo_url/mobm/fcfe3dee0e55171580545cf4d4940257.png",
    explorer_host: "https://moonscan.io",
  },
  fuse: {
    name: "Fuse",
    logo: "https://static.debank.com/image/chain/logo_url/fuse/7a21b958761d52d04ff0ce829d1703f4.png",
    explorer_host: "https://explorer.fuse.io",
  },
  klay: {
    name: "Kaia",
    logo: "https://static.debank.com/image/chain/logo_url/klay/4182ee077031d843a57e42746c30c072.png",
    explorer_host: "https://kaiascan.io",
  },
  astar: {
    name: "Astar",
    logo: "https://static.debank.com/image/chain/logo_url/astar/398c7e0014bdada3d818367a7273fabe.png",
    explorer_host: "https://blockscout.com/astar",
  },
  iotx: {
    name: "IoTeX",
    logo: "https://static.debank.com/image/chain/logo_url/iotx/d3be2cd8677f86bd9ab7d5f3701afcc9.png",
    explorer_host: "https://iotexscan.io",
  },
  rsk: {
    name: "Rootstock",
    logo: "https://static.debank.com/image/chain/logo_url/rsk/ff47def89fba98394168bf5f39920c8c.png",
    explorer_host: "https://rootstock.blockscout.com",
  },
  dfk: {
    name: "DFK",
    logo: "https://static.debank.com/image/chain/logo_url/dfk/233867c089c5b71be150aa56003f3f7a.png",
    explorer_host:
      "https://subnets.avax.network/defi-kingdoms/dfk-chain/explorer",
  },
  tlos: {
    name: "Telos EVM",
    logo: "https://static.debank.com/image/chain/logo_url/tlos/6191b8e0b261536044fc70ba746ba2c9.png",
    explorer_host: "https://www.teloscan.io",
  },
  nova: {
    name: "Arbitrum Nova",
    logo: "https://static.debank.com/image/chain/logo_url/nova/06eb2b7add8ba443d5b219c04089c326.png",
    explorer_host: "https://nova.arbiscan.io",
  },
  canto: {
    name: "Canto",
    logo: "https://static.debank.com/image/chain/logo_url/canto/47574ef619e057d2c6bbce1caba57fb6.png",
    explorer_host: "https://tuber.build",
  },
  doge: {
    name: "Dogechain",
    logo: "https://static.debank.com/image/chain/logo_url/doge/2538141079688a7a43bc22c7b60fb45f.png",
    explorer_host: "https://explorer.dogechain.dog",
  },
  kava: {
    name: "Kava",
    logo: "https://static.debank.com/image/chain/logo_url/kava/b26bf85a1a817e409f9a3902e996dc21.png",
    explorer_host: "https://kavascan.com",
  },
  cfx: {
    name: "Conflux",
    logo: "https://static.debank.com/image/chain/logo_url/cfx/eab0c7304c6820b48b2a8d0930459b82.png",
    explorer_host: "https://evm.confluxscan.io",
  },
  era: {
    name: "zkSync Era",
    logo: "https://static.debank.com/image/chain/logo_url/era/2cfcd0c8436b05d811b03935f6c1d7da.png",
    explorer_host: "https://era.zksync.network",
  },
  ron: {
    name: "Ronin",
    logo: "https://static.debank.com/image/chain/logo_url/ron/6e0f509804bc83bf042ef4d674c1c5ee.png",
    explorer_host: "https://explorer.roninchain.com",
  },
  pze: {
    name: "Polygon zkEVM",
    logo: "https://static.debank.com/image/chain/logo_url/pze/a2276dce2d6a200c6148fb975f0eadd3.png",
    explorer_host: "https://zkevm.polygonscan.com",
  },
  core: {
    name: "CORE",
    logo: "https://static.debank.com/image/chain/logo_url/core/ccc02f660e5dd410b23ca3250ae7c060.png",
    explorer_host: "https://scan.coredao.org",
  },
  wemix: {
    name: "WEMIX",
    logo: "https://static.debank.com/image/chain/logo_url/wemix/d1ba88d1df6cca0b0cb359c36a09c054.png",
    explorer_host: "https://explorer.wemix.com",
  },
  flr: {
    name: "Flare",
    logo: "https://static.debank.com/image/chain/logo_url/flr/9ee03d5d7036ad9024e81d55596bb4dc.png",
    explorer_host: "https://flare-explorer.flare.network",
  },
  oas: {
    name: "Oasys",
    logo: "https://static.debank.com/image/chain/logo_url/oas/61dfecab1ba8a404354ce94b5a54d4b3.png",
    explorer_host: "https://scan.oasys.games",
  },
  zora: {
    name: "Zora",
    logo: "https://static.debank.com/image/chain/logo_url/zora/de39f62c4489a2359d5e1198a8e02ef1.png",
    explorer_host: "https://explorer.zora.energy",
  },
  base: {
    name: "Base",
    logo: "https://static.debank.com/image/chain/logo_url/base/ccc1513e4f390542c4fb2f4b88ce9579.png",
    explorer_host: "https://basescan.org",
  },
  linea: {
    name: "Linea",
    logo: "https://static.debank.com/image/chain/logo_url/linea/32d4ff2cf92c766ace975559c232179c.png",
    explorer_host: "https://lineascan.build",
  },
  mnt: {
    name: "Mantle",
    logo: "https://static.debank.com/image/chain/logo_url/mnt/0af11a52431d60ded59655c7ca7e1475.png",
    explorer_host: "https://mantlescan.xyz",
  },
  manta: {
    name: "Manta Pacific",
    logo: "https://static.debank.com/image/chain/logo_url/manta/0e25a60b96a29d6a5b9e524be7565845.png",
    explorer_host: "https://pacific-explorer.manta.network",
  },
  scrl: {
    name: "Scroll",
    logo: "https://static.debank.com/image/chain/logo_url/scrl/1fa5c7e0bfd353ed0a97c1476c9c42d2.png",
    explorer_host: "https://scrollscan.com",
  },
  opbnb: {
    name: "opBNB",
    logo: "https://static.debank.com/image/chain/logo_url/opbnb/07e2e686e363a842d0982493638e1285.png",
    explorer_host: "https://mainnet.opbnbscan.com",
  },
  shib: {
    name: "Shibarium",
    logo: "https://static.debank.com/image/chain/logo_url/shib/4ec79ed9ee4988dfdfc41e1634a447be.png",
    explorer_host: "https://shibariumscan.io",
  },
  mode: {
    name: "Mode",
    logo: "https://static.debank.com/image/chain/logo_url/mode/466e6e12f4fd827f8f497cceb0601a5e.png",
    explorer_host: "https://explorer.mode.network",
  },
  zeta: {
    name: "ZetaChain",
    logo: "https://static.debank.com/image/chain/logo_url/zeta/d0e1b5e519d99c452a30e83a1263d1d0.png",
    explorer_host: "https://zetachain.blockscout.com",
  },
  rari: {
    name: "RARI",
    logo: "https://static.debank.com/image/chain/logo_url/rari/67fc6abba5cfc6bb3a57bb6afcf5afee.png",
    explorer_host: "https://mainnet.explorer.rarichain.org",
  },
  merlin: {
    name: "Merlin",
    logo: "https://static.debank.com/image/chain/logo_url/merlin/458e4686dfb909ba871bd96fe45417a8.png",
    explorer_host: "https://scan.merlinchain.io",
  },
  blast: {
    name: "Blast",
    logo: "https://static.debank.com/image/chain/logo_url/blast/15132294afd38ce980639a381ee30149.png",
    explorer_host: "https://blastscan.io",
  },
  karak: {
    name: "Karak",
    logo: "https://static.debank.com/image/chain/logo_url/karak/a9e47f00f6eeb2c9cc8f9551cff5fe68.png",
    explorer_host: "https://explorer.karak.network",
  },
  frax: {
    name: "Fraxtal",
    logo: "https://static.debank.com/image/chain/logo_url/frax/2e210d888690ad0c424355cc8471d48d.png",
    explorer_host: "https://fraxscan.com",
  },
  xlayer: {
    name: "X Layer",
    logo: "https://static.debank.com/image/chain/logo_url/xlayer/282a62903a4c74a964b704a161d1ba39.png",
    explorer_host: "https://www.oklink.com/xlayer",
  },
  itze: {
    name: "Immutable zkEVM",
    logo: "https://static.debank.com/image/chain/logo_url/itze/ce3a511dc511053b1b35bb48166a5d39.png",
    explorer_host: "https://explorer.immutable.com",
  },
  btr: {
    name: "Bitlayer",
    logo: "https://static.debank.com/image/chain/logo_url/btr/78ff16cf14dad73c168a70f7c971e401.png",
    explorer_host: "https://www.btrscan.com",
  },
  b2: {
    name: "B²",
    logo: "https://static.debank.com/image/chain/logo_url/b2/6ca6c8bc33af59c5b9273a2b7efbd236.png",
    explorer_host: "https://explorer.bsquared.network",
  },
  bob: {
    name: "BOB",
    logo: "https://static.debank.com/image/chain/logo_url/bob/4e0029be99877775664327213a8da60e.png",
    explorer_host: "https://explorer.gobob.xyz",
  },
  reya: {
    name: "Reya",
    logo: "https://static.debank.com/image/chain/logo_url/reya/20d71aad4279c33229297da1f00d8ae1.png",
    explorer_host: "https://explorer.reya.network",
  },
  bb: {
    name: "BounceBit",
    logo: "https://static.debank.com/image/chain/logo_url/bb/da74a4980f24d870cb43ccd763e0c966.png",
    explorer_host: "https://bbscan.io",
  },
  taiko: {
    name: "Taiko",
    logo: "https://static.debank.com/image/chain/logo_url/taiko/7723fbdb38ef181cd07a8b8691671e6b.png",
    explorer_host: "https://taikoscan.io",
  },
  cyber: {
    name: "Cyber",
    logo: "https://static.debank.com/image/chain/logo_url/cyber/3a3c0c5da5fa8876c8c338afae0db478.png",
    explorer_host: "https://cyberscan.co",
  },
  sei: {
    name: "Sei",
    logo: "https://static.debank.com/image/chain/logo_url/sei/34ddf58f678be2db5b2636b59c9828b5.png",
    explorer_host: "https://seitrace.com",
  },
  mint: {
    name: "Mint",
    logo: "https://static.debank.com/image/chain/logo_url/mint/86404f93cd4e51eafcc2e244d417c03f.png",
    explorer_host: "https://mintscan.org",
  },
  chiliz: {
    name: "Chiliz",
    logo: "https://static.debank.com/image/chain/logo_url/chiliz/548bc261b49eabea7227832374e1fcb0.png",
    explorer_host: "https://chiliscan.com",
  },
  dbk: {
    name: "DBK Chain",
    logo: "https://static.debank.com/image/chain/logo_url/dbk/1255de5a9316fed901d14c069ac62f39.png",
    explorer_host: "https://scan.dbkchain.io",
  },
  croze: {
    name: "Cronos zkEVM",
    logo: "https://static.debank.com/image/chain/logo_url/croze/e9572bb5f00a04dd2e828dae75456abe.png",
    explorer_host: "https://explorer.zkevm.cronos.org",
  },
  gravity: {
    name: "Gravity",
    logo: "https://static.debank.com/image/chain/logo_url/gravity/fa9a1d29f671b85a653f293893fa27e3.png",
    explorer_host: "https://explorer.gravity.xyz",
  },
  lisk: {
    name: "Lisk",
    logo: "https://static.debank.com/image/chain/logo_url/lisk/4d4970237c52104a22e93993de3dcdd8.png",
    explorer_host: "https://blockscout.lisk.com",
  },
  orderly: {
    name: "Orderly",
    logo: "https://static.debank.com/image/chain/logo_url/orderly/aedf85948240dddcf334205794d2a6c9.png",
    explorer_host: "https://explorer.orderly.network",
  },
  ape: {
    name: "ApeChain",
    logo: "https://static.debank.com/image/chain/logo_url/ape/290d3884861ae5e09394c913f788168d.png",
    explorer_host: "https://apescan.io",
  },
  ethlink: {
    name: "Etherlink",
    logo: "https://static.debank.com/image/chain/logo_url/ethlink/76f6335793b594863f41df992dc53d22.png",
    explorer_host: "https://explorer.etherlink.com",
  },
  zircuit: {
    name: "Zircuit",
    logo: "https://static.debank.com/image/chain/logo_url/zircuit/0571a12255432950da5112437058fa5b.png",
    explorer_host: "https://explorer.zircuit.com",
  },
  world: {
    name: "World Chain",
    logo: "https://static.debank.com/image/chain/logo_url/world/3e8c6af046f442cf453ce79a12433e2f.png",
    explorer_host: "https://worldscan.org",
  },
  morph: {
    name: "Morph",
    logo: "https://static.debank.com/image/chain/logo_url/morph/2b5255a6c3a36d4b39e1dea02aa2f097.png",
    explorer_host: "https://explorer.morphl2.io",
  },
  swell: {
    name: "SwellChain",
    logo: "https://static.debank.com/image/chain/logo_url/swell/3e98b1f206af5f2c0c2cc4d271ee1070.png",
    explorer_host: "https://explorer.swellnetwork.io",
  },
  zero: {
    name: "ZERΩ",
    logo: "https://static.debank.com/image/chain/logo_url/zero/d9551d98b98482204b93544f90b43985.png",
    explorer_host: "https://zero-network.calderaexplorer.xyz",
  },
  sonic: {
    name: "Sonic",
    logo: "https://static.debank.com/image/chain/logo_url/sonic/8ba4d8395618ec1329ea7142b0fde642.png",
    explorer_host: "https://sonicscan.org",
  },
  corn: {
    name: "Corn",
    logo: "https://static.debank.com/image/chain/logo_url/corn/2ac7405fee5fdeee5964ba0bcf2216f4.png",
    explorer_host: "https://cornscan.io",
  },
  hsk: {
    name: "HashKey",
    logo: "https://static.debank.com/image/chain/logo_url/hsk/3f35eb1691403fe4eae7a1d1c45b704c.png",
    explorer_host: "https://explorer.hsk.xyz",
  },
  ink: {
    name: "Ink",
    logo: "https://static.debank.com/image/chain/logo_url/ink/af5b553a5675342e28bdb794328e8727.png",
    explorer_host: "https://explorer.inkonchain.com",
  },
  vana: {
    name: "Vana",
    logo: "https://static.debank.com/image/chain/logo_url/vana/b2827795c1556eeeaeb58cb3411d0b15.png",
    explorer_host: "https://vanascan.io",
  },
  sophon: {
    name: "Sophon",
    logo: "https://static.debank.com/image/chain/logo_url/sophon/edc0479e5fc884b240959449ef44a386.png",
    explorer_host: "https://sophscan.xyz",
  },
  duck: {
    name: "DuckChain",
    logo: "https://static.debank.com/image/chain/logo_url/duck/b0b13c10586f03bcfc12358c48a22c95.png",
    explorer_host: "https://scan.duckchain.io",
  },
  abs: {
    name: "Abstract",
    logo: "https://static.debank.com/image/chain/logo_url/abs/c59200aadc06c79d7c061cfedca85c38.png",
    explorer_host: "https://abscan.org",
  },
  soneium: {
    name: "Soneium",
    logo: "https://static.debank.com/image/chain/logo_url/soneium/35014ebaa414b336a105ff2115ba2116.png",
    explorer_host: "https://soneium.blockscout.com",
  },
  bera: {
    name: "Berachain",
    logo: "https://static.debank.com/image/chain/logo_url/bera/89db55160bb8bbb19464cabf17e465bc.png",
    explorer_host: "https://berascan.com",
  },
  uni: {
    name: "Unichain",
    logo: "https://static.debank.com/image/chain/logo_url/uni/7e9011cb7bd0d19deb7727280aa5c8b1.png",
    explorer_host: "https://uniscan.xyz",
  },
  story: {
    name: "Story",
    logo: "https://static.debank.com/image/chain/logo_url/story/d2311c0952f9801e0d42e3b87b4bd755.png",
    explorer_host: "https://www.storyscan.xyz",
  },
  lens: {
    name: "Lens",
    logo: "https://static.debank.com/image/chain/logo_url/lens/d41e14ba300d526518fb8ad20714685b.png",
    explorer_host: "https://explorer.lens.xyz",
  },
  hyper: {
    name: "HyperEVM",
    logo: "https://static.debank.com/image/chain/logo_url/hyper/0b3e288cfe418e9ce69eef4c96374583.png",
    explorer_host: "https://www.hyperscan.com",
  },
  hemi: {
    name: "Hemi",
    logo: "https://static.debank.com/image/chain/logo_url/hemi/db2e74d52c77b941d01f9beae0767ab6.png",
    explorer_host: "https://explorer.hemi.xyz",
  },
  plume: {
    name: "Plume",
    logo: "https://static.debank.com/image/chain/logo_url/plume/f74d0d202dd8af7baf6940864ee79006.png",
    explorer_host: "https://explorer.plume.org",
  },
};
