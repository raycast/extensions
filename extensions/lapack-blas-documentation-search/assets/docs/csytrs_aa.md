```fortran
subroutine csytrs_aa (
        character uplo,
        integer n,
        integer nrhs,
        complex, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( * ) work,
        integer lwork,
        integer info
)
```

CSYTRS_AA solves a system of linear equations A\*X = B with a complex
symmetric matrix A using the factorization A = U\*\*T\*T\*U or
A = L\*T\*L\*\*T computed by CSYTRF_AA.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are stored
> as an upper or lower triangular matrix.
> = 'U':  Upper triangular, form is A = U\*\*T\*T\*U;
> = 'L':  Lower triangular, form is A = L\*T\*L\*\*T.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

A : COMPLEX array, dimension (LDA,N) [in]
> Details of factors computed by CSYTRF_AA.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges as computed by CSYTRF_AA.

B : COMPLEX array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= max(1,3\*N-2).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
