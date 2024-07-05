import { typeMapping, damageTypeMapping } from './type';
import { PokemonStatData } from './pokemon';
import { Request } from './request';

// 最细粒度接口对象结构, 包含name和url两个key
export interface Detail {
    name: string,
    url: string,
}

// 技能学习世代详情
export interface MoveVersionGroupDetail {
    level_learned_at: number,
    move_learn_method: Detail,
    version_group: Detail
}

// 技能各世代学习
export interface MoveVersionDetail {
    move: Detail,
    version_group_details: MoveVersionGroupDetail[]
}

// 技能多语言翻译
export interface MoveDetailLanguageName {
    language: Detail,
    name: string
}

// 技能详情
export interface MoveDetail {
    id: number,
    accuracy: number,
    damage_class: {
        name: string,
        url: string,
    },
    names: MoveDetailLanguageName[],
    power: number,
    pp: number,
    type: Detail,
}

// 最终返回的数据结构
export interface MoveLevelDetail {
    // en_name: string,
    cn_name: string,
    id: number,
    level: number,  // 习得等级
    type: string,   // 属性
    damage_class: string,   // 伤害类型
    desc: string,
    power: number,      // 威力
    accuracy: number,   // 命中
    pp: number,
}

interface TotalInfo {
    moves: MoveVersionDetail[]
}

function getMoveLevel(move: MoveVersionDetail) {
    // 获取某个技能在第九世代在多少级可以升级学习到(找不到的话去第八世代)
    let tmp = (
        move.version_group_details.filter(item => (item.version_group.name === "scarlet-violet" && item.move_learn_method.name === "level-up") ? item.level_learned_at : -1) ||
        move.version_group_details.filter(item => (item.version_group.name === "sword-shield" && item.move_learn_method.name === "level-up") ? item.level_learned_at : -1) ||
        move.version_group_details.filter(item => (item.version_group.name === "ultra-sun-ultra-moon" && item.move_learn_method.name === "level-up") ? item.level_learned_at : -1) ||
        move.version_group_details.filter(item => (item.version_group.name === "sun-moon" && item.move_learn_method.name === "level-up") ? item.level_learned_at : -1)
    );

    // let tmp = move.version_group_details.map(item => (item.version_group.name === "scarlet-violet") && (item.move_learn_method.name === "level-up") ? item.level_learned_at : -1 );
    return tmp[0].level_learned_at
}

// NOTE: 获取升级技能学习情况
export async function GetMoves(id: string, totalInfo:TotalInfo, pokemonStatData: PokemonStatData) {
    var moveLevelDetails: MoveLevelDetail[] = [];
    let candidateMoveInfos = totalInfo.moves.filter((item: MoveVersionDetail) => getMoveLevel(item) > 0)
    // 尝试使用Promise.all来并发请求
    var promises = candidateMoveInfos.map(async (move: MoveVersionDetail) => {
        let moveUrl = move.move.url;    // 查询该技能详情的url, 可以获取中文名, 威力, 命中, pp等信息
        let moveLevel = getMoveLevel(move);
        let result = await Request(moveUrl, "GET", null, {});
        return {moveLevel, result}
    })
    var results = await Promise.all(promises);
    console.log('Pokemon Moves finished.')
    results.sort((a, b) => a.moveLevel - b.moveLevel);
    for (let i = 0; i < results.length; i ++) {
        let moveDetail: MoveDetail = results[i].result;
        let moveLevel = results[i].moveLevel;
        let cn_name_list = (
            moveDetail.names.filter(item => (item.language.name === "zh-Hans") ? item.name : "") ||
            moveDetail.names.filter(item => (item.language.name === "zh-Hant") ? item.name : "")
        );

        // console.log('moveDetail.names', moveDetail.names);
        let tmp = moveDetail.names.filter(item => (item.language.name === "en") ? item.name : "")[0];
        let _moveLevelDetail: MoveLevelDetail = {
            // en_name: moveDetail.names.filter(item => (item.language.name === "en") ? item.name : "")[0].name,
            // en_name: "",
            cn_name: cn_name_list[0].name,
            id: moveDetail.id,
            level: moveLevel,  // 习得等级
            type: typeMapping[moveDetail.type.name as keyof typeof typeMapping],   // NOTE: 使用类型断言，告诉ts我的name是typeMapping的一个key
            damage_class: damageTypeMapping[moveDetail.damage_class.name as keyof typeof damageTypeMapping],   // 伤害类型
            desc: "",
            power: moveDetail.power,      // 威力
            accuracy: moveDetail.accuracy,   // 命中
            pp: moveDetail.pp,
        };
        moveLevelDetails.push(_moveLevelDetail);
    }
    // console.log('moveLevelDetails=', moveLevelDetails)
    
    pokemonStatData.moves = moveLevelDetails;
    return pokemonStatData

}