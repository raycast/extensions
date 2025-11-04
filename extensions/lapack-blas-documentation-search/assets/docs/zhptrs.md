```fortran
subroutine zhptrs (
        character uplo,
        integer n,
        integer nrhs,
        complex*16, dimension( * ) ap,
        integer, dimension( * ) ipiv,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

ZHPTRS solves a system of linear equations A\*X = B with a complex
Hermitian matrix A stored in packed format using the factorization
A = U\*D\*U\*\*H or A = L\*D\*L\*\*H computed by ZHPTRF.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are stored
> as an upper or lower triangular matrix.
> = 'U':  Upper triangular, form is A = U\*D\*U\*\*H;
> = 'L':  Lower triangular, form is A = L\*D\*L\*\*H.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

AP : COMPLEX\*16 array, dimension (N\*(N+1)/2) [in]
> The block diagonal matrix D and the multipliers used to
> obtain the factor U or L as computed by ZHPTRF, stored as a
> packed triangular matrix.

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by ZHPTRF.

B : COMPLEX\*16 array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
