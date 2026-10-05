```fortran
subroutine dtpmlqt (
        character side,
        character trans,
        integer m,
        integer n,
        integer k,
        integer l,
        integer mb,
        double precision, dimension( ldv, * ) v,
        integer ldv,
        double precision, dimension( ldt, * ) t,
        integer ldt,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        double precision, dimension( * ) work,
        integer info
)
```

DTPMQRT applies a real orthogonal matrix Q obtained from a
real block reflector H to a general
real matrix C, which consists of two blocks A and B.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply Q or Q\*\*T from the Left;
> = 'R': apply Q or Q\*\*T from the Right.

TRANS : CHARACTER\*1 [in]
> = 'N':  No transpose, apply Q;
> = 'T':  Transpose, apply Q\*\*T.

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

MB : INTEGER [in]
> The block size used for the storage of T.  K >= MB >= 1.
> This must be the same value of MB used to generate T
> in DTPLQT.

V : DOUBLE PRECISION array, dimension (LDV,K) [in]
> The i-th row must contain the vector which defines the
> elementary reflector H(i), for i = 1,2,...,k, as returned by
> DTPLQT in B.  See Further Details.

LDV : INTEGER [in]
> The leading dimension of the array V. LDV >= K.

T : DOUBLE PRECISION array, dimension (LDT,K) [in]
> The upper triangular factors of the block reflectors
> as returned by DTPLQT, stored as a MB-by-K matrix.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= MB.

A : DOUBLE PRECISION array, dimension [in,out]
> (LDA,N) if SIDE = 'L' or
> (LDA,K) if SIDE = 'R'
> On entry, the K-by-N or M-by-K matrix A.
> On exit, A is overwritten by the corresponding block of
> Q\*C or Q\*\*T\*C or C\*Q or C\*Q\*\*T.  See Further Details.

LDA : INTEGER [in]
> The leading dimension of the array A.
> If SIDE = 'L', LDA >= max(1,K);
> If SIDE = 'R', LDA >= max(1,M).

B : DOUBLE PRECISION array, dimension (LDB,N) [in,out]
> On entry, the M-by-N matrix B.
> On exit, B is overwritten by the corresponding block of
> Q\*C or Q\*\*T\*C or C\*Q or C\*Q\*\*T.  See Further Details.

LDB : INTEGER [in]
> The leading dimension of the array B.
> LDB >= max(1,M).

WORK : DOUBLE PRECISION array. The dimension of WORK is [out]
> N\*MB if SIDE = 'L', or  M\*MB if SIDE = 'R'.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
