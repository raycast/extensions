import { readCSVtoMapping } from './parse_csv';
import { useState, useEffect } from 'react';
import { Request } from './request';
import { createInterface } from 'readline';
import { typeMapping, damageTypeMapping } from './type';
import path from 'path';
import fs from 'fs';
import * as ab from './ability';
import { BlockList } from 'net';
import { GetStats } from './stats';
import { GetMoves, MoveLevelDetail } from './move';
import { GetAbility, AbilityDetail } from './ability';
import { GetTypes } from './type';


interface Detail {
    name: string,
    url: string,
}

// 接口返回的不同属性克制的伤害关系
interface DamageRelation {
    damage_relations: {
        double_damage_from: Detail[],
        double_damage_to: Detail[],
        half_damage_from: Detail[],
        half_damage_to: Detail[],
        no_damage_from: Detail[],
        no_damage_to: Detail[]
    }
}

// 根据id查询宝可梦的属性信息, 也是最后插件返回的数据格式
export interface PokemonStatData {
    name: string,
    id ?: string,
    generation?: string// 第几世代
    types: string[],
    abilities ?: AbilityDetail[],
    base_stats: {
        hp : number,       // NOTE: ?:表示hp属性可选, 这样在初始化的时候可以直接一个{}完事
        attack : number,
        defense : number,
        special_attack : number,
        special_defense : number,
        speed : number,
        total : number,
    },  // 种族值
    damage_relations: {
        quarter_damage_from: string[],      // 受到*1/4的伤害
        half_damage_from: string[],         // 受到*1/2的伤害
        double_damage_from: string[],       // 受到*2的伤害
        quadruple_damage_from: string[],    // 受到*4的伤害
        none_damage_from: string[],         // 受到*0的伤害
        strong_damage_to: string[],
        weak_damage_to: string[],
    }
    
    image ?: string,
    moves ?: MoveLevelDetail[],
}


function GetGeneration(id: string) {
    // https://wiki.52poke.com/wiki/%E5%AE%9D%E5%8F%AF%E6%A2%A6%E5%88%97%E8%A1%A8%EF%BC%88%E6%8C%89%E4%BC%BD%E5%8B%92%E5%B0%94%E5%9B%BE%E9%89%B4%E7%BC%96%E5%8F%B7%EF%BC%89
    // I、II、III、IV、V、VI、VII、VIII、IX、X、XI、XII
    if (Number(id) <= 151) {
        return "Ⅰ关东地区"
    } else if (Number(id) <= 251) {
        return "II成都地区"
    } else if (Number(id) <= 386) {
        return "III丰缘地区"
    } else if (Number(id) <= 493) {
        return "IV神奥地区"
    } else if (Number(id) <= 649) {
        return "V合众地区"
    } else if (Number(id) <= 721) {
        return "VI卡洛斯地区"
    } else if (Number(id) <= 809) {
        return "VII阿罗拉地区"
    } else if (Number(id) <= 905) {
        return "VIII伽勒尔地区"
    } else {
        return "IX帕底亚地区"
    }
}


export function GetPokemonStats(name: string) {
    // NOTE: useState钩子函数，接收一个通过接口定义好的初始数据
    const [pokemonStatData, setPokemonStats] = useState<PokemonStatData>({
        name: "",
        types: [],
        base_stats: {
            hp: 0,
            attack: 0,
            defense: 0,
            special_attack: 0,
            special_defense: 0,
            speed: 0,
            total: 0
        },
        damage_relations: {
            quarter_damage_from: [],      // 受到*1/4的伤害
            half_damage_from: [],         // 受到*1/2的伤害
            double_damage_from: [],       // 受到*2的伤害
            quadruple_damage_from: [],    // 受到*4的伤害
            none_damage_from: [],         // 受到*0的伤害
            strong_damage_to: [],
            weak_damage_to: []
        },
        
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);


    useEffect(() => {
        async function SearchPokemonIDFromName(name: string) {
            setLoading(true);
            // 中英文对照网址: https://wiki.52poke.com/zh-hans/%E5%AE%9D%E5%8F%AF%E6%A2%A6%E5%88%97%E8%A1%A8%EF%BC%88%E5%9C%A8%E5%85%B6%E4%BB%96%E8%AF%AD%E8%A8%80%E4%B8%AD%EF%BC%89
            // icon网址: https://zh.pngtree.com/freepng/3d-realistrc-pokemon-ball-art-pic_14754358.html
            
            let nameMappingFilePath = path.join(__dirname, '../pokemon-tools/assets', 'name_chn_eng.csv');
            console.log('filepath:', nameMappingFilePath)
            let pokemonNameMapping = await readCSVtoMapping(nameMappingFilePath);
            let id = pokemonNameMapping[name];
            
            // 获取种族值
            const urlPokemonStats = `https://pokeapi.co/api/v2/pokemon/${id}`;
            let totalInfo = await Request(urlPokemonStats, 'GET', null, {})
            // console.log('Pokemon Total Info finished.')

            // 获取属性
            await GetTypes(id, pokemonStatData);
            // 获取种族值
            await GetStats(id, totalInfo, pokemonStatData);
            // 获取特性详情
            await GetAbility(id, totalInfo, pokemonStatData, name);
            // 获取技能详情
            await GetMoves(id, totalInfo, pokemonStatData);

            // NOTE: 更新最后返回的数据
            pokemonStatData.name = name;
            pokemonStatData.id = id.padStart(3, '0');
            pokemonStatData.generation = GetGeneration(id);
            pokemonStatData.image = `https://raw.githubusercontent.com/HybridShivam/Pokemon/master/assets/images/${pokemonStatData.id}.png`
            
            setPokemonStats(pokemonStatData);
            setLoading(false);
        };
        SearchPokemonIDFromName(name);
    }, [])

    return {pokemonStatData, loading, error}
}