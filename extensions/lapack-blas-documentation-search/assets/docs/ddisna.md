```fortran
subroutine ddisna (
        character job,
        integer m,
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) sep,
        integer info
)
```

DDISNA computes the reciprocal condition numbers for the eigenvectors
of a real symmetric or complex Hermitian matrix or for the left or
right singular vectors of a general m-by-n matrix. The reciprocal
condition number is the 'gap' between the corresponding eigenvalue or
singular value and the nearest other one.

The bound on the error, measured by angle in radians, in the I-th
computed vector is given by

DLAMCH( 'E' ) \* ( ANORM / SEP( I ) )

where ANORM = 2-norm(A) = max( abs( D(j) ) ).  SEP(I) is not allowed
to be smaller than DLAMCH( 'E' )\*ANORM in order to limit the size of
the error bound.

DDISNA may also be used to compute error bounds for eigenvectors of
the generalized symmetric definite eigenproblem.

## Parameters
JOB : CHARACTER\*1 [in]
> Specifies for which problem the reciprocal condition numbers
> should be computed:
> = 'E':  the eigenvectors of a symmetric/Hermitian matrix;
> = 'L':  the left singular vectors of a general matrix;
> = 'R':  the right singular vectors of a general matrix.

M : INTEGER [in]
> The number of rows of the matrix. M >= 0.

N : INTEGER [in]
> If JOB = 'L' or 'R', the number of columns of the matrix,
> in which case N >= 0. Ignored if JOB = 'E'.

D : DOUBLE PRECISION array, dimension (M) if JOB = 'E' [in]
> dimension (min(M,N)) if JOB = 'L' or 'R'
> The eigenvalues (if JOB = 'E') or singular values (if JOB =
> 'L' or 'R') of the matrix, in either increasing or decreasing
> order. If singular values, they must be non-negative.

SEP : DOUBLE PRECISION array, dimension (M) if JOB = 'E' [out]
> dimension (min(M,N)) if JOB = 'L' or 'R'
> The reciprocal condition numbers of the vectors.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
