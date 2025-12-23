```fortran
subroutine dlaexc (
        logical wantq,
        integer n,
        double precision, dimension( ldt, * ) t,
        integer ldt,
        double precision, dimension( ldq, * ) q,
        integer ldq,
        integer j1,
        integer n1,
        integer n2,
        double precision, dimension( * ) work,
        integer info
)
```

DLAEXC swaps adjacent diagonal blocks T11 and T22 of order 1 or 2 in
an upper quasi-triangular matrix T by an orthogonal similarity
transformation.

T must be in Schur canonical form, that is, block upper triangular
with 1-by-1 and 2-by-2 diagonal blocks; each 2-by-2 diagonal block
has its diagonal elements equal and its off-diagonal elements of
opposite sign.

## Parameters
WANTQ : LOGICAL [in]
> = .TRUE. : accumulate the transformation in the matrix Q;
> = .FALSE.: do not accumulate the transformation.

N : INTEGER [in]
> The order of the matrix T. N >= 0.

T : DOUBLE PRECISION array, dimension (LDT,N) [in,out]
> On entry, the upper quasi-triangular matrix T, in Schur
> canonical form.
> On exit, the updated matrix T, again in Schur canonical form.

LDT : INTEGER [in]
> The leading dimension of the array T. LDT >= max(1,N).

Q : DOUBLE PRECISION array, dimension (LDQ,N) [in,out]
> On entry, if WANTQ is .TRUE., the orthogonal matrix Q.
> On exit, if WANTQ is .TRUE., the updated matrix Q.
> If WANTQ is .FALSE., Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q.
> LDQ >= 1; and if WANTQ is .TRUE., LDQ >= N.

J1 : INTEGER [in]
> The index of the first row of the first block T11.

N1 : INTEGER [in]
> The order of the first block T11. N1 = 0, 1 or 2.

N2 : INTEGER [in]
> The order of the second block T22. N2 = 0, 1 or 2.

WORK : DOUBLE PRECISION array, dimension (N) [out]

INFO : INTEGER [out]
> = 0: successful exit
> = 1: the transformed matrix T would be too far from Schur
> form; the blocks are not swapped and T and Q are
> unchanged.
