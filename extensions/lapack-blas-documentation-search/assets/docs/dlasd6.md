```fortran
subroutine dlasd6 (
        integer icompq,
        integer nl,
        integer nr,
        integer sqre,
        double precision, dimension( * ) d,
        double precision, dimension( * ) vf,
        double precision, dimension( * ) vl,
        double precision alpha,
        double precision beta,
        integer, dimension( * ) idxq,
        integer, dimension( * ) perm,
        integer givptr,
        integer, dimension( ldgcol, * ) givcol,
        integer ldgcol,
        double precision, dimension( ldgnum, * ) givnum,
        integer ldgnum,
        double precision, dimension( ldgnum, * ) poles,
        double precision, dimension( * ) difl,
        double precision, dimension( * ) difr,
        double precision, dimension( * ) z,
        integer k,
        double precision c,
        double precision s,
        double precision, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

DLASD6 computes the SVD of an updated upper bidiagonal matrix B
obtained by merging two smaller ones by appending a row. This
routine is used only for the problem which requires all singular
values and optionally singular vector matrices in factored form.
B is an N-by-M matrix with N = NL + NR + 1 and M = N + SQRE.
A related subroutine, DLASD1, handles the case in which all singular
values and singular vectors of the bidiagonal matrix are desired.

DLASD6 computes the SVD as follows:

( D1(in)    0    0       0 )
B = U(in) \* (   Z1\*\*T   a   Z2\*\*T    b ) \* VT(in)
(   0       0   D2(in)   0 )

= U(out) \* ( D(out) 0) \* VT(out)

where Z\*\*T = (Z1\*\*T a Z2\*\*T b) = u\*\*T VT\*\*T, and u is a vector of dimension M
with ALPHA and BETA in the NL+1 and NL+2 th entries and zeros
elsewhere; and the entry b is empty if SQRE = 0.

The singular values of B can be computed using D1, D2, the first
components of all the right singular vectors of the lower block, and
the last components of all the right singular vectors of the upper
block. These components are stored and updated in VF and VL,
respectively, in DLASD6. Hence U and VT are not explicitly
referenced.

The singular values are stored in D. The algorithm consists of two
stages:

The first stage consists of deflating the size of the problem
when there are multiple singular values or if there is a zero
in the Z vector. For each such occurrence the dimension of the
secular equation problem is reduced by one. This stage is
performed by the routine DLASD7.

The second stage consists of calculating the updated
singular values. This is done by finding the roots of the
secular equation via the routine DLASD4 (as called by DLASD8).
This routine also updates VF and VL and computes the distances
between the updated singular values and the old singular
values.

DLASD6 is called from DLASDA.

## Parameters
ICOMPQ : INTEGER [in]
> Specifies whether singular vectors are to be computed in
> factored form:
> = 0: Compute singular values only.
> = 1: Compute singular vectors in factored form as well.

NL : INTEGER [in]
> The row dimension of the upper block.  NL >= 1.

NR : INTEGER [in]
> The row dimension of the lower block.  NR >= 1.

SQRE : INTEGER [in]
> = 0: the lower block is an NR-by-NR square matrix.
> = 1: the lower block is an NR-by-(NR+1) rectangular matrix.
> 
> The bidiagonal matrix has row dimension N = NL + NR + 1,
> and column dimension M = N + SQRE.

D : DOUBLE PRECISION array, dimension ( NL+NR+1 ). [in,out]
> On entry D(1:NL,1:NL) contains the singular values of the
> upper block, and D(NL+2:N) contains the singular values
> of the lower block. On exit D(1:N) contains the singular
> values of the modified matrix.

VF : DOUBLE PRECISION array, dimension ( M ) [in,out]
> On entry, VF(1:NL+1) contains the first components of all
> right singular vectors of the upper block; and VF(NL+2:M)
> contains the first components of all right singular vectors
> of the lower block. On exit, VF contains the first components
> of all right singular vectors of the bidiagonal matrix.

VL : DOUBLE PRECISION array, dimension ( M ) [in,out]
> On entry, VL(1:NL+1) contains the  last components of all
> right singular vectors of the upper block; and VL(NL+2:M)
> contains the last components of all right singular vectors of
> the lower block. On exit, VL contains the last components of
> all right singular vectors of the bidiagonal matrix.

ALPHA : DOUBLE PRECISION [in,out]
> Contains the diagonal element associated with the added row.

BETA : DOUBLE PRECISION [in,out]
> Contains the off-diagonal element associated with the added
> row.

IDXQ : INTEGER array, dimension ( N ) [in,out]
> This contains the permutation which will reintegrate the
> subproblem just solved back into sorted order, i.e.
> D( IDXQ( I = 1, N ) ) will be in ascending order.

PERM : INTEGER array, dimension ( N ) [out]
> The permutations (from deflation and sorting) to be applied
> to each block. Not referenced if ICOMPQ = 0.

GIVPTR : INTEGER [out]
> The number of Givens rotations which took place in this
> subproblem. Not referenced if ICOMPQ = 0.

GIVCOL : INTEGER array, dimension ( LDGCOL, 2 ) [out]
> Each pair of numbers indicates a pair of columns to take place
> in a Givens rotation. Not referenced if ICOMPQ = 0.

LDGCOL : INTEGER [in]
> leading dimension of GIVCOL, must be at least N.

GIVNUM : DOUBLE PRECISION array, dimension ( LDGNUM, 2 ) [out]
> Each number indicates the C or S value to be used in the
> corresponding Givens rotation. Not referenced if ICOMPQ = 0.

LDGNUM : INTEGER [in]
> The leading dimension of GIVNUM and POLES, must be at least N.

POLES : DOUBLE PRECISION array, dimension ( LDGNUM, 2 ) [out]
> On exit, POLES(1,\*) is an array containing the new singular
> values obtained from solving the secular equation, and
> POLES(2,\*) is an array containing the poles in the secular
> equation. Not referenced if ICOMPQ = 0.

DIFL : DOUBLE PRECISION array, dimension ( N ) [out]
> On exit, DIFL(I) is the distance between I-th updated
> (undeflated) singular value and the I-th (undeflated) old
> singular value.

DIFR : DOUBLE PRECISION array, [out]
> dimension ( LDDIFR, 2 ) if ICOMPQ = 1 and
> dimension ( K ) if ICOMPQ = 0.
> On exit, DIFR(I,1) = D(I) - DSIGMA(I+1), DIFR(K,1) is not
> defined and will not be referenced.
> 
> If ICOMPQ = 1, DIFR(1:K,2) is an array containing the
> normalizing factors for the right singular vector matrix.
> 
> See DLASD8 for details on DIFL and DIFR.

Z : DOUBLE PRECISION array, dimension ( M ) [out]
> The first elements of this array contain the components
> of the deflation-adjusted updating row vector.

K : INTEGER [out]
> Contains the dimension of the non-deflated matrix,
> This is the order of the related secular equation. 1 <= K <=N.

C : DOUBLE PRECISION [out]
> C contains garbage if SQRE =0 and the C-value of a Givens
> rotation related to the right null space if SQRE = 1.

S : DOUBLE PRECISION [out]
> S contains garbage if SQRE =0 and the S-value of a Givens
> rotation related to the right null space if SQRE = 1.

WORK : DOUBLE PRECISION array, dimension ( 4 \* M ) [out]

IWORK : INTEGER array, dimension ( 3 \* N ) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = 1, a singular value did not converge
