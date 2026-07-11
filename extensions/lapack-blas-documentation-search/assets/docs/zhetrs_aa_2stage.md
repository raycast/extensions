```fortran
subroutine zhetrs_aa_2stage (
        character uplo,
        integer n,
        integer nrhs,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( * ) tb,
        integer ltb,
        integer, dimension( * ) ipiv,
        integer, dimension( * ) ipiv2,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

ZHETRS_AA_2STAGE solves a system of linear equations A\*X = B with a
hermitian matrix A using the factorization A = U\*\*H\*T\*U or
A = L\*T\*L\*\*H computed by ZHETRF_AA_2STAGE.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are stored
> as an upper or lower triangular matrix.
> = 'U':  Upper triangular, form is A = U\*\*H\*T\*U;
> = 'L':  Lower triangular, form is A = L\*T\*L\*\*H.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in]
> Details of factors computed by ZHETRF_AA_2STAGE.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

TB : COMPLEX\*16 array, dimension (LTB) [out]
> Details of factors computed by ZHETRF_AA_2STAGE.

LTB : INTEGER [in]
> The size of the array TB. LTB >= 4\*N.

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges as computed by
> ZHETRF_AA_2STAGE.

IPIV2 : INTEGER array, dimension (N) [in]
> Details of the interchanges as computed by
> ZHETRF_AA_2STAGE.

B : COMPLEX\*16 array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
