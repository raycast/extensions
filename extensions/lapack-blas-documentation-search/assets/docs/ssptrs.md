```fortran
subroutine ssptrs (
        character uplo,
        integer n,
        integer nrhs,
        real, dimension( * ) ap,
        integer, dimension( * ) ipiv,
        real, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

SSPTRS solves a system of linear equations A\*X = B with a real
symmetric matrix A stored in packed format using the factorization
A = U\*D\*U\*\*T or A = L\*D\*L\*\*T computed by SSPTRF.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are stored
> as an upper or lower triangular matrix.
> = 'U':  Upper triangular, form is A = U\*D\*U\*\*T;
> = 'L':  Lower triangular, form is A = L\*D\*L\*\*T.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

AP : REAL array, dimension (N\*(N+1)/2) [in]
> The block diagonal matrix D and the multipliers used to
> obtain the factor U or L as computed by SSPTRF, stored as a
> packed triangular matrix.

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by SSPTRF.

B : REAL array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
