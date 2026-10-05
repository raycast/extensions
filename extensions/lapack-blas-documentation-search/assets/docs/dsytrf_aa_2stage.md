```fortran
subroutine dsytrf_aa_2stage (
        character uplo,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) tb,
        integer ltb,
        integer, dimension( * ) ipiv,
        integer, dimension( * ) ipiv2,
        double precision, dimension( * ) work,
        integer lwork,
        integer info
)
```

DSYTRF_AA_2STAGE computes the factorization of a real symmetric matrix A
using the Aasen's algorithm.  The form of the factorization is

A = U\*\*T\*T\*U  or  A = L\*T\*L\*\*T

where U (or L) is a product of permutation and unit upper (lower)
triangular matrices, and T is a symmetric band matrix with the
bandwidth of NB (NB is internally selected and stored in TB( 1 ), and T is
LU factorized with partial pivoting).

This is the blocked version of the algorithm, calling Level 3 BLAS.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the symmetric matrix A.  If UPLO = 'U', the leading
> N-by-N upper triangular part of A contains the upper
> triangular part of the matrix A, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading N-by-N lower triangular part of A contains the lower
> triangular part of the matrix A, and the strictly upper
> triangular part of A is not referenced.
> 
> On exit, L is stored below (or above) the subdiagonal blocks,
> when UPLO  is 'L' (or 'U').

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

TB : DOUBLE PRECISION array, dimension (MAX(1,LTB)) [out]
> On exit, details of the LU factorization of the band matrix.

LTB : INTEGER [in]
> The size of the array TB. LTB >= MAX(1,4\*N), internally
> used to select NB such that LTB >= (3\*NB+1)\*N.
> 
> If LTB = -1, then a workspace query is assumed; the
> routine only calculates the optimal size of LTB,
> returns this value as the first entry of TB, and
> no error message related to LTB is issued by XERBLA.

IPIV : INTEGER array, dimension (N) [out]
> On exit, it contains the details of the interchanges, i.e.,
> the row and column k of A were interchanged with the
> row and column IPIV(k).

IPIV2 : INTEGER array, dimension (N) [out]
> On exit, it contains the details of the interchanges, i.e.,
> the row and column k of T were interchanged with the
> row and column IPIV2(k).

WORK : DOUBLE PRECISION workspace of size (MAX(1,LWORK)) [out]

LWORK : INTEGER [in]
> The size of WORK. LWORK >= MAX(1,N), internally used
> to select NB such that LWORK >= N\*NB.
> 
> If LWORK = -1, then a workspace query is assumed; the
> routine only calculates the optimal size of the WORK array,
> returns this value as the first entry of the WORK array, and
> no error message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = i, band LU factorization failed on i-th column
