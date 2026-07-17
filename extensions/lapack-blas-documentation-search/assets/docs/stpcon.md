```fortran
subroutine stpcon (
        character norm,
        character uplo,
        character diag,
        integer n,
        real, dimension( * ) ap,
        real rcond,
        real, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

STPCON estimates the reciprocal of the condition number of a packed
triangular matrix A, in either the 1-norm or the infinity-norm.

The norm of A is computed and an estimate is obtained for
norm(inv(A)), then the reciprocal of the condition number is
computed as
RCOND = 1 / ( norm(A) \* norm(inv(A)) ).

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies whether the 1-norm condition number or the
> infinity-norm condition number is required:
> = '1' or 'O':  1-norm;
> = 'I':         Infinity-norm.

UPLO : CHARACTER\*1 [in]
> = 'U':  A is upper triangular;
> = 'L':  A is lower triangular.

DIAG : CHARACTER\*1 [in]
> = 'N':  A is non-unit triangular;
> = 'U':  A is unit triangular.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

AP : REAL array, dimension (N\*(N+1)/2) [in]
> The upper or lower triangular matrix A, packed columnwise in
> a linear array.  The j-th column of A is stored in the array
> AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.
> If DIAG = 'U', the diagonal elements of A are not referenced
> and are assumed to be 1.

RCOND : REAL [out]
> The reciprocal of the condition number of the matrix A,
> computed as RCOND = 1/(norm(A) \* norm(inv(A))).

WORK : REAL array, dimension (3\*N) [out]

IWORK : INTEGER array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
