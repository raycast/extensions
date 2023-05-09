/*
 * Copyright (c) 2015 Nate Sanden.
 *
 * This code makes use of "Title Caps" by John Gruber/John Resig.
 * It is open-sourced under the MIT license.
 *
 * License: http://www.opensource.org/licenses/mit-license.php
 * Original source: at http://ejohn.org/files/titleCaps.js
 *
 * Ported to JavaScript By John Resig - http://ejohn.org/ - 21 May 2008
 * Original by John Gruber - http://daringfireball.net/ - 10 May 2008
 */
export default class TitleCapsEditor {
	private value : string;
	private ORIGINAL : number;
	private STYLE_ASSOCIATED_PRESS_4 : number;
	private STYLE_ASSOCIATED_PRESS_5 : number;
	private STYLE_CHICAGO_MANUAL : number;
	private mode : number;
	private original_title : string;
	private prepositions : string[];
	private articles : string[];
	private conjunctions : string[];
	private other : string[];
	private small : string;
	private punct : string;
	self = this;
	
	constructor(value : string) {
	  this.value = value;
	  this.ORIGINAL = 1;
	  this.STYLE_ASSOCIATED_PRESS_4 = 2;
	  this.STYLE_ASSOCIATED_PRESS_5 = 3;
	  this.STYLE_CHICAGO_MANUAL = 4;
	  this.mode = this.ORIGINAL;
	  this.original_title = '';
	  this.prepositions = [
		'about','above','across','after','against','along','among','around','at','before','behind','below','beneath','beside','between','beyond','but','by','despite','down','during','except','for','from','in','inside','into','like','near','of','off','on','onto','out','outside','over','past','per','since','through','throughout','till','to','toward','under','underneath','until','up','upon','via','with','within','without'];
	  this.articles = [ 'a','an','the'  ];
	  this.conjunctions = ['and', 'but', 'or', 'nor', 'for', 'yet', 'so' ];
	  this.other = ['if','en','as','vs.','v[.]?' ];
	  this.small = '(' + (this.prepositions.concat(this.articles).concat(this.conjunctions).concat(this.other)).join('|') + ')';
	  this.punct = "([!\"#$%&'()*+,./:;<=>?@[\\\\\\]^_`{|}~-]*)";
	}
	
	/**
	 * Public method. Sets capitalization mode/rule.
	 */
	public setMode(mode : number): void {
		const val = parseInt(this.value, 10);
		this.mode = val >= 1 && val <= 4 ? val : this.STYLE_CHICAGO_MANUAL;
		this.mode = mode;
	};
	
	/**
	 * method. Gets capitalization mode/rule.
	 */
	public getMode(): number {
		return this.mode;
	};
	
	/**
	 * Converts text/phrase to titlecase
	 */
	public titleCaps(title : string): string {
		const split = /[:.;?!] |(?: |^)[""]/g;
		let index = 0;

		if(this.mode === this.ORIGINAL){
			if(!this.original_title) {
				this.original_title = title;
			}
			return this.original_title;
		}

		const m = split.exec(title);

		const _self = this.self;

		const _title = title.substring(index, m ? m.index : title.length)
		.replace(/\b([A-Za-z][a-z.'"]*)\b/g, function(all){
			return /[A-Za-z]\.[A-Za-z]/.test(all) ? all : _self.upper(all);
		})
		.replace(/\b([A-Za-z]*[^\u0000-\u007F]+[A-Za-z]*)\b/g, function(all){
			return _self.upper(all);
		})
		.replace(RegExp("\\b" + _self.small + "\\b", "ig"), function(word) { 
			if (_self.mode == _self.STYLE_ASSOCIATED_PRESS_4) {
				return word.length >= 4 ? _self.upper(word) : _self.lower(word);
			}
			else if (_self.mode == _self.STYLE_ASSOCIATED_PRESS_5) {
				return word.length >= 5 ? _self.upper(word) : _self.lower(word);
			}
			else {
				return _self.lower(word); 
			}
		})
		.replace(RegExp("^" + _self.punct + _self.small + "\\b", "ig"), function(all, punct, word){
			return punct + _self.upper(word);
		})
		.replace(RegExp("\\b" + _self.small + _self.punct + "$", "ig"), _self.upper)

		index = split.lastIndex;

		return _title;
		
	};
	
	/**
	 * Converts word to lowercase
	 */
	public lower(word : string): string {
		return word.toLowerCase();
	}
    
	/**
	 * Converts the first letter of a word to uppercase
	 */
	public upper(word : string): string {
	  return word.substr(0,1).toUpperCase() + word.substr(1).toLowerCase();
	}
  }