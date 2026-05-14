

# Benchmarks

0. All Models

    Endpoint:
    ```
    https://api.zeroeval.com/leaderboard/models/full?justCanonicals=true
    ```

    Response:
    ```json
    [{
        "model_id": "chatgpt-4o-latest",
        "name": "ChatGPT-4o Latest",
        "organization": "OpenAI",
        "organization_id": "openai",
        "organization_country": "US",
        "params": null,
        "context": 128000,
        "canonical_model_id": null,
        "release_date": "2024-05-13",
        "announcement_date": "2024-05-13",
        "multimodal": true,
        "license": "proprietary",
        "knowledge_cutoff": null,
        "input_price": "2.5000000000000000",
        "output_price": "10.0000000000000000",
        "throughput": "132.0",
        "latency": null,
        "aime_2025_score": null,
        "hle_score": null,
        "gpqa_score": 0.84,
        "swe_bench_verified_score": null,
        "mmmu_score": null
    }
    ]
    ```

2. List of Categories

    Endpoint:
    ```
    https://api.zeroeval.com/leaderboard/categories
    ```

    Response:
    ```json
    [{
        "category_id": "3d",
        "name": "3D",
        "description": "Category for 3d benchmarks",
        "sort_order": 1000
    }, {
        "category_id": "agent",
        "name": "Agent",
        "description": "Category for agent benchmarks",
        "sort_order": 1000
    }, {
        "category_id": "agents",
        "name": "Agents",
        "description": "Category for agents benchmarks",
        "sort_order": 1000
    }, {
        "category_id": "audio",
        "name": "Audio",
        "description": "Category for audio benchmarks",
        "sort_order": 1000
    }, {
        "category_id": "chemistry",
        "name": "Chemistry",
        "description": "Category for chemistry benchmarks",
        "sort_order": 1000
    }, {
        "category_id": "code",
        "name": "Code",
        "description": "Category for code benchmarks",
        "sort_order": 1000
    }, {
        "category_id": "coding",
        "name": "Coding",
        "description": "Category for coding benchmarks",
        "sort_order": 1000
    }]
    ```

3. Leaderboard by Catergory

    Endpoints:
    ```
    https://api.zeroeval.com/leaderboard/categories/{category_id}/benchmarks?top_n=15

    https://api.zeroeval.com/leaderboard/categories/code/benchmarks?top_n=15

    https://api.zeroeval.com/leaderboard/categories/healthcare/benchmarks?top_n=15

    https://api.zeroeval.com/leaderboard/categories/agent/benchmarks?top_n=15
    ```

    Response:
    ```json
    {
        "category": {
            "category_id": "finance",
            "name": "Finance",
            "description": "Category for finance benchmarks"
        },
        "benchmarks": [
            {
                "benchmark_id": "acebench",
                "name": "ACEBench",
                "description": "ACEBench is a comprehensive benchmark for evaluating Large Language Models' tool usage capabilities across three primary evaluation types: Normal (basic tool usage scenarios), Special (tool usage with ambiguous or incomplete instructions), and Agent (multi-agent interactions simulating real-world dialogues). The benchmark covers 4,538 APIs across 8 major domains and 68 sub-domains including technology, finance, entertainment, society, health, culture, and environment, supporting both English and Chinese languages.",
                "modality": "text",
                "max_score": 1,
                "verified": false,
                "model_count": 2,
                "top_models": [
                    {
                        "rank": 1,
                        "model_id": "kimi-k2-instruct",
                        "model_name": "Kimi K2 Instruct",
                        "organization_name": "Moonshot AI",
                        "benchmark_score": 0.765,
                        "normalized_score": 0.765,
                        "verified": false
                    },
                    {
                        "rank": 2,
                        "model_id": "kimi-k2-instruct-0905",
                        "model_name": "Kimi K2-Instruct-0905",
                        "organization_name": "Moonshot AI",
                        "benchmark_score": 0.765,
                        "normalized_score": 0.765,
                        "verified": false
                    }
                ]
            }
        ]
    }
    ```

4. Leaderboard by Arenas

    Endpoints:
    ```
    https://api.zeroeval.com/magia/arenas/chat-arena/leaderboard?limit=10&offset=0
    https://api.zeroeval.com/magia/arenas/text-to-svg/leaderboard?limit=10&offset=0
    https://api.zeroeval.com/magia/arenas/chat-arena/leaderboard?limit=50&offset=0
    ```

    Response:
    ```json
    {
        "leaderboard": [
        {
                "variant_id": "claude-opus-4-5-20251101",
                "variant_key": "claude-opus-4-5-20251101",
                "variant_metadata": {
                    "model_name": "Claude Opus 4.5",
                    "organization": "anthropic"
                },
                "mu": 15.884192194213362,
                "sigma": 0.8142277379904116,
                "conservative_rating": 13.441508980242128,
                "matches_played": 207,
                "wins": 120,
                "win_rate": 57.97,
                "created_at": "2025-12-07T16:13:23.929148+00:00",
                "updated_at": "2026-01-10T14:51:33.078322+00:00",
                "model_id": "claude-opus-4-5-20251101",
                "model_name": "Claude Opus 4.5",
                "organization": "anthropic",
                "announcement_date": "2025-11-24",
                "throughput_cps": 149.81749748348145,
                "input_price": 5,
                "output_price": 25,
                "license": "Proprietary",
                "is_open_source": false
            },
        ],
        "total_count": 22,
        "limit": 10,
        "offset": 0
    }
    ```

5. Model Information

    Endpoints:
    ```
    https://api.zeroeval.com/leaderboard/models/{model_id}
    https://api.zeroeval.com/leaderboard/models/gemini-3-pro-preview
    ```

    Response:
    ```json
    {
        "model_id": "gemini-3-pro-preview",
        "name": "Gemini 3 Pro",
        "organization": {
            "id": "google",
            "name": "Google",
            "website": "https://google.com"
        },
        "description": "Gemini 3 Pro is the first model in the new Gemini 3 series. It is best for complex tasks that require broad world knowledge and advanced reasoning across modalities. Gemini 3 Pro uses dynamic thinking by default to reason through prompts, and features a 1 million-token input context window with 64k output tokens.",
        "release_date": "2025-11-18",
        "announcement_date": "2025-11-18",
        "multimodal": true,
        "knowledge_cutoff": "2025-01-31",
        "param_count": null,
        "training_tokens": null,
        "available_in_zeroeval": true,
        "reviews_count": 0,
        "reviews_avg_rating": 0,
        "license": {
            "name": "Proprietary",
            "allow_commercial": false
        },
        "model_family": null,
        "fine_tuned_from": null,
        "tags": null,
        "sources": {
            "api_ref": "https://ai.google.dev/gemini-api/docs/models/gemini-3-pro",
            "playground": "https://aistudio.google.com/",
            "paper": null,
            "scorecard_blog": "https://blog.google/products/gemini/gemini-3",
            "repo": null,
            "weights": null
        },
        "benchmarks": [
            {
                "benchmark_id": "aime-2025",
                "name": "AIME 2025",
                "description": "All 30 problems from the 2025 American Invitational Mathematics Examination (AIME I and AIME II), testing olympiad-level mathematical reasoning with integer answers from 000-999. Used as an AI benchmark to evaluate large language models' ability to solve complex mathematical problems requiring multi-step logical deductions and structured symbolic reasoning.",
                "categories": [
                    "math",
                    "reasoning"
                ],
                "modality": "text",
                "max_score": 1,
                "score": 1,
                "normalized_score": 1,
                "verified": false,
                "self_reported": true,
                "self_reported_source": "https://blog.google/products/gemini/gemini-3",
                "analysis_method": "With code execution",
                "verification_date": null,
                "verification_notes": null
            },
        ],
        "providers": [
            {
                "provider_id": "google",
                "name": "Google",
                "website": "https://ai.google.dev",
                "deprecated": false,
                "deprecated_at": null,
                "pricing": {
                    "input_per_million": 2,
                    "output_per_million": 12
                },
                "quantization": null,
                "limits": {
                    "max_input_tokens": 1048576,
                    "max_output_tokens": 65536
                },
                "performance": {
                    "throughput": "90.0",
                    "latency": "0.6"
                },
                "features": {
                    "web_search": null,
                    "function_calling": null,
                    "structured_output": null,
                    "code_execution": null,
                    "batch_inference": null,
                    "finetuning": null
                },
                "modalities": {
                    "input": {
                        "text": true,
                        "image": true,
                        "audio": true,
                        "video": true
                    },
                    "output": {
                        "text": true,
                        "image": false,
                        "audio": false,
                        "video": false
                    }
                }
            }
        ],
        "comparison_model": {
            "model_id": "gpt-5.2-pro-2025-12-11",
            "name": "GPT-5.2 Pro",
            "organization_name": "OpenAI",
            "release_date": "2025-12-11",
            "announcement_date": "2025-12-11",
            "knowledge_cutoff": null,
            "param_count": null,
            "multimodal": true,
            "license": {
                "name": "Proprietary",
                "allow_commercial": false
            },
            "benchmarks": {
                "aime-2025": 1,
                "arc-agi": 0.905,
                "arc-agi-v2": 0.542,
                "browsecomp": 0.779,
                "gpqa": 0.932,
                "hle": 0.366,
                "hmmt-2025": 1
            },
            "provider": {
                "name": "OpenAI",
                "input_cost": 21,
                "output_cost": 168,
                "max_input_tokens": 400000,
                "max_output_tokens": 128000,
                "modalities": {
                    "input": {
                        "text": false,
                        "image": true,
                        "audio": false,
                        "video": false
                    },
                    "output": {
                        "text": true,
                        "image": false,
                        "audio": false,
                        "video": false
                    }
                }
            }
        }
    }
    ```

6. List of Benchmarks

    Endpoint:
    ```
    https://api.zeroeval.com/leaderboard/benchmarks
    ```

    Response:
    ```json
    [
        {
            "benchmark_id": "aa-index",
            "name": "AA-Index",
            "description": "No official academic documentation found for this benchmark. Extensive research through ArXiv, IEEE/ACL/NeurIPS papers, and university research sites yielded no peer-reviewed sources for an 'aa-index' benchmark. This entry requires verification from official academic sources.",
            "categories": [
                "general"
            ],
            "modality": "text",
            "max_score": 1.0,
            "verified": false,
            "model_count": 3
        },
        {
            "benchmark_id": "aa-lcr",
            "name": "AA-LCR",
            "description": "Agent Arena Long Context Reasoning benchmark",
            "categories": [
                "long_context",
                "reasoning"
            ],
            "modality": "text",
            "max_score": 1.0,
            "verified": false,
            "model_count": 1
        }
    ]
    ```

7. List of Models

    Endpoint:
    ```
    https://api.zeroeval.com/leaderboard/models/full?justCanonicals=true&include_benchmarks=true
    ```

    Response:
    ```json
   [{
    "model_id": "chatgpt-4o-latest",
    "name": "ChatGPT-4o Latest",
    "organization_id": "openai",
    "organization": "OpenAI",
    "params": null,
    "context": 128000,
    "release_date": "2024-05-13",
    "announcement_date": "2024-05-13",
    "license": "proprietary",
    "multimodal": true,
    "price": "2.5000000000000000",
    "throughput": "132.0",
    "latency": null,
    "price_per_input_token": "2.5000000000000000",
    "price_per_output_token": "10.0000000000000000",
    "benchmarks": [{
        "dataset_name": "gpqa",
        "score": 0.84,
        "is_self_reported": true,
        "analysis_method": null,
        "date_recorded": null,
        "source_link": "https://www.hkubs.hku.hk/aimodelrankings_en/report/AdvancedReasoning.pdf"
    }]
  }]
    ```
