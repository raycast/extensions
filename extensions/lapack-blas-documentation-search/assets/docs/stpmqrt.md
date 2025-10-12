```fortran
subroutine stpmqrt (
        character side,
        character trans,
        integer m,
        integer n,
        integer k,
        integer l,
        integer nb,
        real, dimension( ldv, * ) v,
        integer ldv,
        real, dimension( ldt, * ) t,
        integer ldt,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( * ) work,
        integer info
)
```

STPMQRT applies a real orthogonal matrix Q obtained from a
real block reflector H to a general
real matrix C, which consists of two blocks A and B.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply Q or Q^T from the Left;
> = 'R': apply Q or Q^T from the Right.

TRANS : CHARACTER\*1 [in]
> = 'N':  No transpose, apply Q;
> = 'T':  Transpose, apply Q^T.

M : INTEGER [in]
> The number of rows of the matrix B. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix B. N >= 0.

K : INTEGER [in]
> The number of elementary reflectors whose product defines
> the matrix Q.

L : INTEGER [in]
> The order of the trapezoidal part of V.
> K >= L >= 0.  See Further Details.

NB : INTEGER [in]
> The block size used for the storage of T.  K >= NB >= 1.
> This must be the same value of NB used to generate T
> in CTPQRT.

V : REAL array, dimension (LDV,K) [in]
> The i-th column must contain the vector which defines the
> elementary reflector H(i), for i = 1,2,...,k, as returned by
> CTPQRT in B.  See Further Details.

LDV : INTEGER [in]
> The leading dimension of the array V.
> If SIDE = 'L', LDV >= max(1,M);
> if SIDE = 'R', LDV >= max(1,N).

T : REAL array, dimension (LDT,K) [in]
> The upper triangular factors of the block reflectors
> as returned by CTPQRT, stored as a NB-by-K matrix.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= NB.

A : REAL array, dimension [in,out]
> (LDA,N) if SIDE = 'L' or
> (LDA,K) if SIDE = 'R'
> On entry, the K-by-N or M-by-K matrix A.
> On exit, A is overwritten by the corresponding block of
> Q\*C or Q^T\*C or C\*Q or C\*Q^T.  See Further Details.

LDA : INTEGER [in]
> The leading dimension of the array A.
> If SIDE = 'L', LDC >= max(1,K);
> If SIDE = 'R', LDC >= max(1,M).

B : REAL array, dimension (LDB,N) [in,out]
> On entry, the M-by-N matrix B.
> On exit, B is overwritten by the corresponding block of
> Q\*C or Q^T\*C or C\*Q or C\*Q^T.  See Further Details.

LDB : INTEGER [in]
> The leading dimension of the array B.
> LDB >= max(1,M).

WORK : REAL array. The dimension of WORK is [out]
> N\*NB if SIDE = 'L', or  M\*NB if SIDE = 'R'.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
